import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const UsingCountMetric: MetricExtractor = {
  name: 'usingCount',
  description: 'el número de declaraciones using en el código.',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const regex = /^\s*using\s+\w+/gm;
    const matches = text.match(regex);
    return {
      label: 'Cantidad de usings',
      value: matches ? matches.length : 0,
    };
  },
};
