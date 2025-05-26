import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const IfCountMetric: MetricExtractor = {
  name: 'ifCount',
  description: 'el número de declaraciones condicionales (if) en el código.',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    let ifCount = 0;
    
    // Process the document line by line to properly handle comments and strings
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text;
      
      // Skip empty lines and comment-only lines
      if (line.trim() === '' || line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
        continue;
      }
      
      // Find all potential 'if' statements in the line
      const regex = /\bif\s*\(/g;
      let match;
      
      while ((match = regex.exec(line)) !== null) {
        // Check if the match is inside a comment or string
        if (!isInsideCommentOrString(line, match.index)) {
          ifCount++;
        }
      }
      
      // Check for 'if' at the end of the line (possible multi-line if statement)
      if (line.trim().match(/\bif\s*$/)) {
        // Look ahead to see if the next line starts with an opening parenthesis
        if (i + 1 < document.lineCount) {
          const nextLine = document.lineAt(i + 1).text.trim();
          if (nextLine.startsWith('(')) {
            // This is a multi-line if statement
            if (!isInsideCommentOrString(line, line.lastIndexOf('if'))) {
              ifCount++;
            }
          }
        }
      }
    }
    
    return {
      label: 'Cantidad de ifs',
      value: ifCount,
    };
  },
};

/**
 * Helper function to check if a position is inside a comment or string literal
 * @param line The line of code
 * @param position The position to check
 * @returns True if the position is inside a comment or string literal
 */
function isInsideCommentOrString(line: string, position: number): boolean {
  // Check if position is inside a single-line comment
  const commentIndex = line.indexOf('//', 0);
  if (commentIndex >= 0 && position > commentIndex) {
    return true;
  }
  
  // Check if position is inside a multi-line comment
  let inMultiLineComment = false;
  let commentStart = -1;
  let commentEnd = -1;
  
  while (true) {
    commentStart = line.indexOf('/*', commentStart + 1);
    if (commentStart === -1 || commentStart >= position) break;
    
    commentEnd = line.indexOf('*/', commentStart + 2);
    if (commentEnd === -1) {
      // Comment continues to the end of the line
      if (position > commentStart) return true;
      break;
    } else if (position > commentStart && position < commentEnd + 2) {
      return true;
    }
    
    commentStart = commentEnd;
  }
  
  // Check if position is inside a string literal
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
