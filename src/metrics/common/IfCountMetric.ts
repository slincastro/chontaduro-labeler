import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const IfCountMetric: Metric = {
  name: 'ifCount',
  description: 'El número de declaraciones condicionales (if) en el código.',
  hasAction: true,
  action: {
    method: 'highlightIfs',
  },
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const languageId = document.languageId;

    // Selecciona el regex adecuado según el lenguaje
    let regex: RegExp;
    if (languageId === 'python') {
      regex = /\bif\s+.*:/g;
    } else {
      regex = /\bif\s*\(/g;
    }

    let ifCount = 0;
    const ifBlocks: { startLine: number, endLine: number, loopType: string }[] = [];

    // Recorre cada línea para evitar contar ifs dentro de comentarios o strings
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text;

      // Saltar líneas vacías o que son solo comentarios
      if (
        line.trim() === '' ||
        line.trim().startsWith('//') ||
        line.trim().startsWith('#') || // Para Python
        line.trim().startsWith('/*') ||
        line.trim().startsWith('*')
      ) {
        continue;
      }

      let match;
      while ((match = regex.exec(line)) !== null) {
        if (!isInsideCommentOrString(line, match.index)) {
          ifCount++;
          
          // Determinar el tipo de if según el lenguaje
          let ifType = 'if';
          if (languageId === 'python') {
            ifType = 'if-python';
          }
          
          // Agregar la ubicación del if
          ifBlocks.push({
            startLine: i,
            endLine: i,
            loopType: ifType
          });
        }
      }
    }

    return {
      label: 'Cantidad de ifs',
      value: ifCount,
      loopBlocks: ifBlocks
    };
  },
};

/**
 * Verifica si la posición está dentro de un comentario o string en la línea.
 */
function isInsideCommentOrString(line: string, position: number): boolean {
  // Comentario de una sola línea
  const commentIndex = line.indexOf('//');
  const hashIndex = line.indexOf('#'); // Para Python

  if ((commentIndex >= 0 && position > commentIndex) || (hashIndex >= 0 && position > hashIndex)) {
    return true;
  }

  // Comentario multilínea en la misma línea
  let commentStart = -1;
  let commentEnd = -1;
  while (true) {
    commentStart = line.indexOf('/*', commentStart + 1);
    if (commentStart === -1 || commentStart >= position) break;

    commentEnd = line.indexOf('*/', commentStart + 2);
    if (commentEnd === -1) {
      if (position > commentStart) return true;
      break;
    } else if (position > commentStart && position < commentEnd + 2) {
      return true;
    }

    commentStart = commentEnd;
  }

  // Dentro de string literal
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < position; i++) {
    const char = line[i];

    if (char === '\\') {
      i++; // Salta el caracter escapado
      continue;
    }

    if (char === '"' || char === "'") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
  }

  return inString;
}
