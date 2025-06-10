import { Metric, MetricResult } from './Metric';
import * as vscode from 'vscode';

export const CodeDuplicationMetric: Metric = {
  name: 'codeDuplication',
  description: 'la cantidad de código duplicado detectado en el archivo.',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const lines = text.split('\n');
    
    // Minimum number of consecutive lines to consider as a duplication
    const MIN_DUPLICATION_LINES = 3;
    
    // Store found duplications to avoid counting them multiple times
    const foundDuplications = new Set<string>();
    let duplicatedLineCount = 0;
    
    // Process each possible starting position
    for (let i = 0; i < lines.length - MIN_DUPLICATION_LINES + 1; i++) {
      // Skip empty lines and single-line comments as starting points
      const currentLine = lines[i].trim();
      if (currentLine === '' || currentLine.startsWith('//') || currentLine.startsWith('/*') || currentLine.startsWith('*')) {
        continue;
      }
      
      // Look for duplications starting from position i
      for (let j = i + 1; j < lines.length - MIN_DUPLICATION_LINES + 1; j++) {
        let duplicatedLines = 0;
        let isDuplication = false;
        
        // Compare consecutive lines
        for (let k = 0; k < MIN_DUPLICATION_LINES; k++) {
          const line1 = lines[i + k].trim();
          const line2 = lines[j + k].trim();
          
          // Skip empty lines and comments in the comparison
          if (line1 === '' || line1.startsWith('//') || line1.startsWith('/*') || line1.startsWith('*') ||
              line2 === '' || line2.startsWith('//') || line2.startsWith('/*') || line2.startsWith('*')) {
            continue;
          }
          
          if (line1 === line2 && line1.length > 5) { // Ignore very short lines
            duplicatedLines++;
          } else {
            break; // Stop at the first non-matching line
          }
        }
        
        // If we found enough consecutive duplicated lines
        if (duplicatedLines >= MIN_DUPLICATION_LINES) {
          isDuplication = true;
          
          // Continue counting to find the full extent of the duplication
          let l = MIN_DUPLICATION_LINES;
          while (i + l < lines.length && j + l < lines.length) {
            const line1 = lines[i + l].trim();
            const line2 = lines[j + l].trim();
            
            if (line1 === line2 && line1.length > 5 && 
                !line1.startsWith('//') && !line1.startsWith('/*') && !line1.startsWith('*')) {
              duplicatedLines++;
              l++;
            } else {
              break;
            }
          }
        }
        
        // If we found a duplication, record it
        if (isDuplication) {
          const duplicationKey = `${i}-${i+duplicatedLines}`;
          if (!foundDuplications.has(duplicationKey)) {
            foundDuplications.add(duplicationKey);
            duplicatedLineCount += duplicatedLines;
          }
        }
      }
    }
    
    // Calculate the percentage of duplicated code
    const totalNonEmptyLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
    }).length;
    
    const duplicationPercentage = totalNonEmptyLines > 0 
      ? (duplicatedLineCount / totalNonEmptyLines) * 100 
      : 0;
    
    return {
      label: 'Porcentaje de código duplicado (%)',
      value: Math.round(duplicationPercentage * 100) / 100, // Round to 2 decimal places
    };
  },
};
