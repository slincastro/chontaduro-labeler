import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const NestingDepthMetric: MetricExtractor = {
  name: 'nestingDepth',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const lines = text.split('\n');

    let maxDepth = 0;
    let maxDepthLineIndex = 0;
    let currentDepth = 0;
    let inBlockComment = false;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      let line = rawLine.trim();

      // Skip block comments
      if (inBlockComment) {
        if (line.includes('*/')) {
          inBlockComment = false;
        }
        continue;
      }

      if (line.startsWith('/*')) {
        inBlockComment = true;
        continue;
      }

      // Skip line comments and empty lines
      if (line.startsWith('//') || line === '') {
        continue;
      }

      // Remove strings to avoid counting braces inside them
      line = line.replace(/(['"`])(\\.|[^\\])*?\1/g, '');

      // Count opening braces
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;

      currentDepth += openBraces;
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
        maxDepthLineIndex = i;
      }

      currentDepth -= closeBraces;

      // Prevent going below zero (in case of mismatched braces)
      if (currentDepth < 0) currentDepth = 0;
    }

    return {
      label: 'Profundidad máxima de bloques anidados',
      value: maxDepth,
      lineNumber: maxDepthLineIndex,
    };
  },
};
