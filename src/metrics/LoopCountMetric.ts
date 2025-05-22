import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const LoopCountMetric: MetricExtractor = {
  name: 'loopCount',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const regex = /\b(for(each)?|while|do)\b/g;
    const matches = text.match(regex);
    return {
      label: 'Bucles (for/while/do)',
      value: matches ? matches.length : 0,
    };
  },
};