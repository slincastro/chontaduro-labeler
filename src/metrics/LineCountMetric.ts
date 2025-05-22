import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const LineCountMetric: MetricExtractor = {
  name: 'lineCount',
  extract(document: vscode.TextDocument): MetricResult {
    return {
      label: 'Líneas',
      value: document.lineCount,
    };
  },
};