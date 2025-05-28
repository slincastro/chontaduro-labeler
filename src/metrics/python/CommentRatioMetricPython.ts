import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const CommentRatioMetricPython: Metric = {
  name: 'commentRatioPython',
  description: 'la proporción de líneas de comentarios respecto al total de líneas de código en Python.',
  extract(document: vscode.TextDocument): MetricResult {
    const totalLines = document.lineCount;
    let commentLineCount = 0;

    for (let i = 0; i < totalLines; i++) {
      const rawLine = document.lineAt(i).text;
      const line = rawLine.trim();

      if (line.length === 0) continue;

      // Comentarios que empiezan con #
      if (line.startsWith('#')) {
        commentLineCount++;
        continue;
      }

      // Comentarios después de código, pero no dentro de strings
      const hashIndex = line.indexOf('#');
      if (hashIndex > 0 && !isInsideString(line, hashIndex)) {
        commentLineCount++;
        continue;
      }

      // Ignorar strings multilinea como """ o '''
      // No se cuenta nada aquí
    }

    const ratio = totalLines > 0 ? (commentLineCount / totalLines) * 100 : 0;

    return {
      label: 'Ratio de comentarios (%) (Python)',
      value: Math.round(ratio * 100) / 100, // Redondea a 2 decimales
    };
  },
};

/**
 * Verifica si una posición está dentro de una string literal
 */
function isInsideString(line: string, position: number): boolean {
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < position; i++) {
    const char = line[i];

    if (char === '\\') {
      i++; // salta caracteres escapados
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