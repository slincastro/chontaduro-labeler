import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const LineCountMetric: MetricExtractor = {
  name: 'lineCount',
  description: 'el número total de líneas de código en el archivo.',
  extract(document: vscode.TextDocument): MetricResult {
    return {
      label: 'Líneas de código',
      value: document.lineCount,
    };
  },
};
