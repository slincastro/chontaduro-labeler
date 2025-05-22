import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const LambdaCountMetric: MetricExtractor = {
  name: 'lambdaCount',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const regex = /=>/g;
    const matches = text.match(regex);
    return {
      label: 'Expresiones lambda',
      value: matches ? matches.length : 0,
    };
  },
};