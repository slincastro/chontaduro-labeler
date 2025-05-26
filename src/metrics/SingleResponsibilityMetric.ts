import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';
import OpenAI from 'openai';

// Separate function to analyze code with OpenAI
async function analyzeWithOpenAI(code: string): Promise<void> {
  try {
    // Get OpenAI API key and model from settings
    const config = vscode.workspace.getConfiguration('lineCounter');
    const apiKey = config.get<string>('openai.apiKey');
    const model = config.get<string>('openai.model') || 'gpt-3.5-turbo';

    if (!apiKey) {
      vscode.window.showWarningMessage('API Key de OpenAI no configurada. Configure la clave en la configuración de la extensión.');
      return;
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Prepare the prompt for OpenAI
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

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'Eres un experto en análisis de código y principios SOLID.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
    });

    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    // Extract JSON from the response
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Update the UI with the analysis result
    const value = analysis.followsSRP ? 0 : 1; // 1 if it doesn't follow SRP (needs refactoring)
    
    // Show notification with the result
    const message = value === 1 
      ? `❌ La clase no cumple con el Principio de Responsabilidad Única: ${analysis.explanation}`
      : `✅ La clase cumple con el Principio de Responsabilidad Única: ${analysis.explanation}`;
    
    vscode.window.showInformationMessage(message, 'Ver detalles').then(selection => {
      if (selection === 'Ver detalles') {
        // Create and show a new document with the detailed analysis
        const detailsContent = `# Análisis de Responsabilidad Única

## Resultado
${analysis.followsSRP ? '✅ La clase cumple con el Principio de Responsabilidad Única' : '❌ La clase no cumple con el Principio de Responsabilidad Única'}

## Explicación
${analysis.explanation}

${analysis.followsSRP ? '' : `## Sugerencias para mejorar
${analysis.suggestions}`}

## Código analizado
\`\`\`
${code}
\`\`\`
`;
        
        vscode.workspace.openTextDocument({ content: detailsContent, language: 'markdown' })
          .then(doc => vscode.window.showTextDocument(doc, { preview: true }));
      }
    });
    
  } catch (error: any) {
    vscode.window.showErrorMessage(`Error al analizar SRP: ${error.message}`);
  }
}

export const SingleResponsibilityMetric: MetricExtractor = {
  name: 'singleResponsibility',
  description: 'evalúa si la clase cumple con el principio de responsabilidad única (SRP).',
  extract(document: vscode.TextDocument): MetricResult {
    // Get the document text
    const code = document.getText();
    
    // Check if the document contains a class
    if (!code.includes('class ')) {
      return {
        label: 'Responsabilidad Única',
        value: 0, // Not applicable for non-class files
      };
    }

    // Analyze the code asynchronously with OpenAI
    // Since the MetricExtractor interface doesn't support async, we'll return a placeholder
    // and update the UI when the analysis is complete
    analyzeWithOpenAI(code).catch((error: Error) => {
      vscode.window.showErrorMessage(`Error al analizar SRP: ${error.message}`);
    });

    return {
      label: 'Responsabilidad Única',
      value: 0, // Default value until analysis completes
    };
  }
};
