import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const CommentLineCountMetricPython: Metric = {
  name: 'commentLineCountPython',
  description: 'Cuenta solo las líneas de comentarios usando # en código Python.',
  extract(document: vscode.TextDocument): MetricResult {
    let commentLineCount = 0;

    for (let i = 0; i < document.lineCount; i++) {
      const rawLine = document.lineAt(i).text;
      const line = rawLine.trim();

      // Línea que comienza con comentario
      if (line.startsWith('#')) {
        commentLineCount++;
        continue;
      }

      // Línea con comentario después de código (no dentro de string)
      const hashIndex = line.indexOf('#');
      if (hashIndex > 0 && !isInsideString(line, hashIndex)) {
        commentLineCount++;
        continue;
      }
    }

    return {
      label: 'Líneas de comentarios (Python)',
      value: commentLineCount,
    };
  },
};

/**
 * Detecta si el `#` está dentro de un string (evita falsos positivos)
 */
function isInsideString(line: string, position: number): boolean {
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < position; i++) {
    const char = line[i];

    if (char === '\\') {
      i++;
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