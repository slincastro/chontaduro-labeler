import * as vscode from 'vscode';

export interface MetricResult {
  label: string;
  value: number;
  lineNumber?: number;
  duplicatedBlocks?: { startLine: number, endLine: number, blockId?: string }[];
}

export interface Metric {
  name: string;
  description: string;
  extract(document: vscode.TextDocument): MetricResult;
}
