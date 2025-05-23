import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const ClassCountMetric: MetricExtractor = {
  name: 'classCount',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    // Regex to match class declarations in various languages
    // This pattern should work for C#, Java, TypeScript, JavaScript, etc.
    const regex = /^\s*(public|private|protected|internal|export|abstract|sealed|static|final)?\s*(public|private|protected|internal|export|abstract|sealed|static|final)?\s*(public|private|protected|internal|export|abstract|sealed|static|final)?\s*class\s+\w+/gm;
    const matches = text.match(regex);
    return {
      label: 'Clases',
      value: matches ? matches.length : 0,
    };
  },
};
