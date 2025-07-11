import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const CommentRatioMetric: Metric = {
  name: 'commentRatio',
  description: 'la proporción de líneas de comentarios respecto al total de líneas de código.',
  extract(document: vscode.TextDocument): MetricResult {
    const totalLines = document.lineCount;
    let commentLineCount = 0;
    
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text.trim();
      
      if (line === '') {
        continue;
      }
      
      if (line.startsWith('//')) {
        commentLineCount++;
        continue;
      }
      
      if (line.startsWith('/*') || line.startsWith('*') || line.startsWith('*/') || 
          (line.includes('/*') && !line.includes('*/')) || 
          (!line.includes('/*') && line.includes('*/'))) {
        commentLineCount++;
        continue;
      }
      
      const commentIndex = line.indexOf('//');
      if (commentIndex > 0 && !isInsideString(line, commentIndex)) {
        commentLineCount++;
        continue;
      }
      
      const multiCommentStart = line.indexOf('/*');
      const multiCommentEnd = line.indexOf('*/');
      if (multiCommentStart >= 0 && !isInsideString(line, multiCommentStart) && 
          (multiCommentEnd === -1 || multiCommentEnd > multiCommentStart)) {
        commentLineCount++;
        continue;
      }
    }
    
    const ratio = totalLines > 0 ? (commentLineCount / totalLines) * 100 : 0;
    
    return {
      label: 'Ratio de comentarios (%)',
      value: Math.round(ratio * 100) / 100, // Round to 2 decimal places
    };
  },
};

/**
 * Helper function to check if a position is inside a string literal
 * @param line The line of code
 * @param position The position to check
 * @returns True if the position is inside a string literal
 */
function isInsideString(line: string, position: number): boolean {
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < position; i++) {
    const char = line[i];
    
    // Handle escape sequences
    if (char === '\\') {
      i++; // Skip the next character
      continue;
    }
    
    // Toggle string state
    if (char === '"' || char === "'") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
  }
  
  return inString;
}
