import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';
import OpenAI from 'openai';

const analysisResults = new Map<string, number>();

async function analyzeWithOpenAI(document: vscode.TextDocument): Promise<void> {
  const code = document.getText();
  const documentUri = document.uri.toString();
  
  try {
    const config = vscode.workspace.getConfiguration('lineCounter');
    const apiKey = config.get<string>('openai.apiKey');
    const model = config.get<string>('openai.model') || 'gpt-3.5-turbo';

    if (!apiKey) {
      vscode.window.showWarningMessage('API Key de OpenAI no configurada. Configure la clave en la configuración de la extensión.');
      analysisResults.set(documentUri, 0);
      return;
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const prompt = `
    Analiza el siguiente código y determina si cumple con el Principio de Responsabilidad Única (SRP).
    El Principio de Responsabilidad Única establece que una clase debe tener una sola razón para cambiar, 
    lo que significa que debe tener una sola responsabilidad o función.

    Código a analizar:
    \`\`\`
    ${code}
    \`\`\`

    Responde con un JSON con el siguiente formato:
    {
      "followsSRP": true/false,
      "explanation": "Explicación detallada de por qué cumple o no con SRP",
      "suggestions": "Sugerencias para mejorar si no cumple con SRP"
    }
    `;

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'Eres un experto en análisis de código y principios SOLID.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    const value = analysis.followsSRP ? 0 : 1; 
    
    analysisResults.set(documentUri, value);
    
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.uri.toString() === documentUri) {
      vscode.commands.executeCommand('lineCounterView.focus');
    }
    
    // Show a simple information message with the result
    const message = value === 1 
      ? `❌ La clase no cumple con el Principio de Responsabilidad Única: ${analysis.explanation}`
      : `✅ La clase cumple con el Principio de Responsabilidad Única: ${analysis.explanation}`;
    
    vscode.window.showInformationMessage(message);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Error al analizar SRP: ${error.message}`);
    analysisResults.set(documentUri, 0);
  }
}

export const SingleResponsibilityMetric: MetricExtractor = {
  name: 'singleResponsibility',
  description: 'evalúa si la clase cumple con el principio de responsabilidad única (SRP).',
  extract(document: vscode.TextDocument): MetricResult {
    const documentUri = document.uri.toString();
    const code = document.getText();
    
    if (!code.includes('class ')) {
      return {
        label: 'Responsabilidad Única',
        value: 0, 
      };
    }

    if (!analysisResults.has(documentUri)) {
      analyzeWithOpenAI(document).catch((error: Error) => {
        vscode.window.showErrorMessage(`Error al analizar SRP: ${error.message}`);
      });
      
      analysisResults.set(documentUri, 0);
    }

    return {
      label: 'Responsabilidad Única',
      value: analysisResults.get(documentUri) || 0,
    };
  }
};
