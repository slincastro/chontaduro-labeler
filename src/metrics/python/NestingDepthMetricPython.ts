import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const NestingDepthMetricPython: Metric = {
    name: 'nestingDepth',
    description: 'Detecta la profundidad máxima de anidamiento lógico en Python, incluyendo estructuras multilínea y expresiones.',
  
    extract(document: vscode.TextDocument): MetricResult {
      const lines = document.getText().split('\n');
      let maxDepth = 0;
      let maxDepthLine = 0;
      let inMultilineString = false;
      let multilineStringDelimiter = '';
  
      // Stack to track indentation levels
      const indentStack: number[] = [0];
  
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].replace(/\t/g, '    '); // Convert tabs to 4 spaces
        const trimmed = line.trim();
  
        // Skip empty lines and comments
        if (trimmed === '' || trimmed.startsWith('#')) {
          continue;
        }
  
        // Handle multiline strings
        if (!inMultilineString) {
          // Check for start of multiline string
          const tripleQuoteMatch = trimmed.match(/(['"]){3}/);
          if (tripleQuoteMatch) {
            inMultilineString = true;
            multilineStringDelimiter = tripleQuoteMatch[1].repeat(3);
            // Check if it ends on the same line
            const restOfLine = trimmed.substring(trimmed.indexOf(multilineStringDelimiter) + 3);
            if (restOfLine.includes(multilineStringDelimiter)) {
              inMultilineString = false;
              multilineStringDelimiter = '';
            }
          }
        } else {
          // Check for end of multiline string
          if (trimmed.includes(multilineStringDelimiter)) {
            inMultilineString = false;
            multilineStringDelimiter = '';
          }
          continue;
        }
        
        if (inMultilineString) {
          continue;
        }
  
        // Get current indentation level
        const currentIndent = line.match(/^ */)?.[0].length ?? 0;
  
        // Adjust the indentation stack based on current indentation
        // Remove levels that are deeper than or equal to current indentation
        while (indentStack.length > 1 && currentIndent <= indentStack[indentStack.length - 1]) {
          indentStack.pop();
        }
  
        // If current line is more indented than the last level in stack, add new level
        if (currentIndent > indentStack[indentStack.length - 1]) {
          indentStack.push(currentIndent);
        }
  
        // Current depth is the stack length minus 1 (since we start with [0])
        const currentDepth = indentStack.length - 1;
        
        // Update max depth if current is greater
        if (currentDepth > maxDepth) {
          maxDepth = currentDepth;
          maxDepthLine = i;
        }
      }
  
      return {
        label: 'Profundidad real (Python)',
        value: maxDepth,
        lineNumber: maxDepthLine,
      };
    }
  };
