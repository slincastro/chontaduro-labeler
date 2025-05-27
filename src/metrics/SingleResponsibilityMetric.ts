import { Metric, MetricResult } from './Metric';
import * as vscode from 'vscode';
import OpenAI from 'openai';

const analysisResults = new Map<string, number>();

async function analyzeWithOpenAI(document: vscode.TextDocument): Promise<void> {
  const code = document.getText();
  const documentUri = document.uri.toString();
  
  // Start loading spinner
  vscode.commands.executeCommand('chontaduro.startLoading');
  
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
    Analiza el siguiente archivo de código y evalúa si, en términos generales, **cumple con el Principio de Responsabilidad Única (SRP)**.
    
    El Principio de Responsabilidad Única (SRP) indica que un módulo (por ejemplo, una clase o un archivo) debería tener una sola razón para cambiar. Esto significa que todas las funciones o clases dentro del archivo deberían estar relacionadas con una única responsabilidad de negocio o técnica.
    
    ### Consideraciones:
    - Evalúa si las funciones, clases o componentes del archivo contribuyen a una única responsabilidad principal.
    - No seas excesivamente estricto: en entornos reales es común que existan pequeñas utilidades o funciones auxiliares siempre que estén alineadas con la responsabilidad principal.
    - Si detectas responsabilidades mezcladas, explica brevemente cuáles son.
    
    ### Código a analizar:
    \`\`\`
    ${code}
    \`\`\`
    
    Responde con un JSON en el siguiente formato:
    
    {
      "followsSRP": true | false,
      "explanation": "Explicación razonada de si el archivo mantiene una responsabilidad única, mencionando elementos clave.",
      "suggestions": "Sugerencias prácticas para mejorar la adherencia al SRP, si aplica. Si cumple, puedes dejar este campo vacío o con 'Ninguna sugerencia'."
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
  } finally {
    // Stop loading spinner regardless of success or failure
    vscode.commands.executeCommand('chontaduro.stopLoading');
  }
}

export const SingleResponsibilityMetric: Metric = {
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
