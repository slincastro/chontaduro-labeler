import * as vscode from 'vscode';

export interface MetricResult {
  label: string;
  value: number;
  lineNumber?: number;
}

export interface MetricExtractor {
  name: string;
  description: string;
  extract(document: vscode.TextDocument): MetricResult;
}
