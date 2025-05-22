import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const UsingCountMetric: MetricExtractor = {
  name: 'usingCount',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const regex = /^\s*using\s+\w+/gm;
    const matches = text.match(regex);
    return {
      label: 'Declaraciones using',
      value: matches ? matches.length : 0,
    };
  },
};