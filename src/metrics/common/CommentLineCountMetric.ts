import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const CommentLineCountMetric: Metric = {
  name: 'commentLineCount',
  description: 'el número total de líneas de comentarios en el código.',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    let commentLineCount = 0;
    
    // Process the document line by line
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text.trim();
      
      // Check for single-line comments (// or ///)
      if (line.startsWith('//')) {
        commentLineCount++;
        continue;
      }
      
      // Check for lines that are part of multi-line comments (/* ... */)
      if (line.startsWith('/*') || line.startsWith('*') || line.startsWith('*/') || 
          (line.includes('/*') && !line.includes('*/')) || 
          (!line.includes('/*') && line.includes('*/'))) {
        commentLineCount++;
        continue;
      }
      
      // Check for lines that contain both code and comments
      const commentIndex = line.indexOf('//');
      if (commentIndex > 0 && !isInsideString(line, commentIndex)) {
        commentLineCount++;
        continue;
      }
      
      // Check for multi-line comments in the middle of a line
      const multiCommentStart = line.indexOf('/*');
      const multiCommentEnd = line.indexOf('*/');
      if (multiCommentStart >= 0 && !isInsideString(line, multiCommentStart) && 
          (multiCommentEnd === -1 || multiCommentEnd > multiCommentStart)) {
        commentLineCount++;
        continue;
      }
    }
    
    return {
      label: 'Líneas de comentarios',
      value: commentLineCount,
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
