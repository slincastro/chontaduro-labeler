import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const LineCountMetric: Metric = {
  name: 'lineCount',
  description: 'el número total de líneas de código en el archivo.',
  extract(document: vscode.TextDocument): MetricResult {
    return {
      label: 'Líneas',
      value: document.lineCount,
    };
  },
};
