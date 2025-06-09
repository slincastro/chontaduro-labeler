import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const ConstructorCountMetricPython: Metric = {
  name: 'constructorCountPython',
  description: 'El número total de constructores definidos en el código Python.',
  hasAction: true,
  action: {
    method: 'highlightConstructors()'
  },
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    let constructorCount = 0;
    const constructorBlocks: { startLine: number, endLine: number, name?: string }[] = [];

    // Detectar clases
    const classRegex = /^\s*class\s+(\w+).*:\s*$/gm;
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const classMatch = lines[i].match(classRegex);
      if (classMatch) {
        const className = classMatch[1];
        const classIndent = lines[i].match(/^(\s*)/)?.[1].length || 0;

        for (let j = i + 1; j < lines.length; j++) {
          const line = lines[j];
          const currentIndent = line.match(/^(\s*)/)?.[1].length || 0;

          if (currentIndent <= classIndent && line.trim() !== '') {
            // Salimos del cuerpo de la clase
            break;
          }

          if (line.trim().startsWith('def __init__(')) {
            constructorCount++;
            
            // Encontramos el inicio del constructor
            const startLine = j;
            
            // Encontramos el final del constructor
            let endLine = j;
            const initIndent = line.match(/^(\s*)/)?.[1].length || 0;
            
            for (let k = j + 1; k < lines.length; k++) {
              const nextLine = lines[k];
              const nextIndent = nextLine.match(/^(\s*)/)?.[1].length || 0;
              
              if (nextLine.trim() === '' || nextIndent > initIndent) {
                endLine = k;
              } else {
                break;
              }
            }
            
            constructorBlocks.push({
              startLine,
              endLine,
              name: `__init__ de ${className}`
            });
          }
        }
      }
    }

    return {
      label: 'Número de constructores',
      value: constructorCount,
      constructorBlocks
    };
  },
};
