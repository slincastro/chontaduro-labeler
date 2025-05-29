import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const UsingCountMetric: Metric = {
  name: 'usingCount',
  description: 'El número de declaraciones de uso/importación en el código (using, import, require).',

  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();

    const patterns = [
      /^\s*using\s+\w+/gm,                     // C#
      /^\s*import\s+[\w*{}\s,]+from\s+['"][^'"]+['"]/gm,  // JS/TS estilo ES6
      /^\s*import\s+[\w.]+/gm,                 // Java, Python, JS simple
      /^\s*from\s+[\w.]+\s+import\s+[\w*.,\s]+/gm, // Python
      /\brequire\s*\(\s*['"][^'"]+['"]\s*\)/gm  // JS estilo CommonJS
    ];

    let totalMatches = 0;

    for (const regex of patterns) {
      const matches = text.match(regex);
      if (matches) {
        totalMatches += matches.length;
      }
    }

    return {
      label: 'Cantidad de declaraciones de uso/importación',
      value: totalMatches,
    };
  },
};