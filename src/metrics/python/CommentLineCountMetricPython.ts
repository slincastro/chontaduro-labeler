import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const CommentLineCountMetricPython: Metric = {
  name: 'commentLineCountPython',
  description: 'el número total de líneas de comentarios en código Python.',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    let commentLineCount = 0;
    let inDocstring = false;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text.trim();

      // Ignorar líneas vacías
      if (line.length === 0) {
        continue;
      }

      // Verifica si está dentro de un docstring
      if (inDocstring) {
        commentLineCount++;
        if (
          line.includes("'''") ||
          line.includes('"""')
        ) {
          inDocstring = false;
        }
        continue;
      }

      // Verifica si la línea comienza con #
      if (line.startsWith('#')) {
        commentLineCount++;
        continue;
      }

      // Verifica si inicia un docstring
      if (
        line.startsWith("'''") ||
        line.startsWith('"""')
      ) {
        commentLineCount++;
        // Si comienza y termina en la misma línea, no entra en docstring
        const quote = line.startsWith("'''") ? "'''" : '"""';
        if (!(line.length > 6 && line.includes(quote, 3))) {
          inDocstring = true;
        }
        continue;
      }

      // Verifica si hay un comentario al final de una línea de código
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
 * Helper function to check if a position is inside a string literal
 * @param line The line of code
 * @param position The position to check
 * @returns True if the position is inside a string literal
 */
function isInsideString(line: string, position: number): boolean {
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < position; i++) {
    const char = line[i];

    // Handle escape sequences
    if (char === '\\') {
      i++; // Skip the next character
      continue;
    }

    // Toggle string state
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