import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const IfCountMetric: MetricExtractor = {
  name: 'ifCount',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const regex = /\bif\s*\(/g;
    const matches = text.match(regex);
    return {
      label: 'Ifs',
      value: matches ? matches.length : 0,
    };
  },
};