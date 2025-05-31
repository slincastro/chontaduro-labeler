import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const AverageMethodSizeMetric: Metric = {
  name: 'averageMethodSize',
  description: 'el número promedio de líneas por método en el código.',
  hasAction: true,
  action: {
    method: 'highlightMethods',
  },
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const lines = text.split('\n');

    const methodSignatureRegex = /^\s*(public|private|protected|internal)?\s*(static|virtual|override|async|new)?\s+[\w<>\[\],\s]+\s+\w+(?:<[\w,\s<>]+>)?\s*\([^)]*\)(?:\s+where\s+[\w\s:,]+)?\s*$/;

    let methodSizes: number[] = [];
    let methodBlocks: { startLine: number, endLine: number, size: number, name?: string }[] = [];
    let insideMethod = false;
    let braceCount = 0;
    let currentSize = 0;
    let methodStartLine = 0;
    let methodName = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!insideMethod) {
        if (methodSignatureRegex.test(line.trim())) {
          // Extract method name from the signature
          const methodNameMatch = line.match(/\s+(\w+)\s*\(/);
          methodName = methodNameMatch ? methodNameMatch[1] : '';
          methodStartLine = i;
          
          let j = i;
          while (j < lines.length && !lines[j].includes('{')) {
            j++;
          }

          if (j < lines.length) {
            insideMethod = true;
            braceCount = 1;
            currentSize = j - i + 1;
            i = j;
          }
        }
      } else {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        currentSize++;

        if (braceCount === 0) {
          methodSizes.push(currentSize);
          methodBlocks.push({
            startLine: methodStartLine,
            endLine: i,
            size: currentSize,
            name: methodName
          });
          insideMethod = false;
        }
      }
    }

    const average = methodSizes.length === 0
      ? 0
      : Math.round(methodSizes.reduce((acc, val) => acc + val, 0) / methodSizes.length);

    return {
      label: 'Tamaño promedio de métodos',
      value: average,
      methodBlocks: methodBlocks
    };
  },
};
