import * as vscode from 'vscode';

export interface MetricResult {
  label: string;
  value: number;
}

export interface MetricExtractor {
  name: string;
  extract(document: vscode.TextDocument): MetricResult;
}