import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const MethodCountMetric: MetricExtractor = {
  name: 'methodCount',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const regex = /^\s*(public|private|protected|internal)?\s*(static|virtual|override|async|new)?\s+[\w<>\[\],]+\s+\w+\s*\([^)]*\)\s*(\{|=>)/gm;
    const matches = text.match(regex);
    return {
      label: 'Métodos',
      value: matches ? matches.length : 0,
    };
  },
};