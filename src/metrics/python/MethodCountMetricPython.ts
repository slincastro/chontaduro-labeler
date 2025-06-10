import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

function removeStringsAndComments(text: string): string {
  let result = '';
  let i = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTripleSingleQuote = false;
  let inTripleDoubleQuote = false;
  let inComment = false;

  while (i < text.length) {
    const char = text[i];
    const next = text[i + 1];
    const next2 = text[i + 2];

    if (!inSingleQuote && !inDoubleQuote && !inTripleSingleQuote && !inTripleDoubleQuote && char === '#') {
      inComment = true;
    }

    if (char === '\n') {
      inComment = false;
      result += char;
      i++;
      continue;
    }

    if (inComment) {
      result += ' '; 
      i++;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === '"' && next === '"' && next2 === '"') {
      if (inTripleDoubleQuote) {
        inTripleDoubleQuote = false;
        i += 3;
        continue;
      } else if (!inTripleSingleQuote) {
        inTripleDoubleQuote = true;
        i += 3;
        continue;
      }
    }

    if (!inSingleQuote && !inDoubleQuote && char === "'" && next === "'" && next2 === "'") {
      if (inTripleSingleQuote) {
        inTripleSingleQuote = false;
        i += 3;
        continue;
      } else if (!inTripleDoubleQuote) {
        inTripleSingleQuote = true;
        i += 3;
        continue;
      }
    }

    if (inTripleSingleQuote || inTripleDoubleQuote) {
      result += ' '; // Replace with space to maintain structure
      i++;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      if (i === 0 || text[i - 1] !== '\\') {
        inDoubleQuote = !inDoubleQuote;
      }
    }

    if (char === "'" && !inDoubleQuote) {
      if (i === 0 || text[i - 1] !== '\\') {
        inSingleQuote = !inSingleQuote;
      }
    }

    if (inSingleQuote || inDoubleQuote) {
      result += ' '; 
      i++;
      continue;
    }

    result += char;
    i++;
  }

  return result;
}

export const MethodCountMetricPython: Metric = {
  name: 'methodCount',
  description: 'El número total de métodos y funciones definidos en código Python.',

  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    
    // Remover strings multilínea y comentarios para evitar falsos positivos
    const cleanedText = removeStringsAndComments(text);
    
    // Regex específica para Python que detecta:
    // - Funciones normales: def function_name(...)
    // - Funciones async: async def function_name(...)
    // - Métodos de clase: def method_name(self, ...)
    // - Métodos estáticos: @staticmethod def method_name(...)
    // - Métodos de clase: @classmethod def method_name(cls, ...)
    // - Funciones con anotaciones de tipo: def func(param: int) -> str:
    const regex = /^\s*(?:@\w+(?:\([^)]*\))?\s+)*(?:async\s+)?def\s+\w+\s*\([^)]*\)\s*(?:->\s*[^:]+)?\s*:/gm;
    
    const matches = cleanedText.match(regex);
    return {
      label: 'Cantidad de métodos (Python)',
      value: matches ? matches.length : 0,
    };
  },
};
