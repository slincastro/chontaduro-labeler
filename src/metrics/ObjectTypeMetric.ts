import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const ObjectTypeMetric: MetricExtractor = {
  name: 'objectType',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    
    // Define patterns for different object types
    const patterns = {
      class: /^\s*(public|private|protected|internal|export)?\s*(abstract|sealed|static|final)?\s*class\s+\w+/gm,
      interface: /^\s*(public|private|protected|internal|export)?\s*interface\s+\w+/gm,
      enum: /^\s*(public|private|protected|internal|export)?\s*enum\s+\w+/gm,
      struct: /^\s*(public|private|protected|internal|export)?\s*struct\s+\w+/gm,
      record: /^\s*(public|private|protected|internal|export)?\s*record\s+\w+/gm,
      namespace: /^\s*namespace\s+[\w.]+/gm,
      delegate: /^\s*(public|private|protected|internal|export)?\s*delegate\s+[\w<>[\],\s]+\s+\w+/gm,
    };
    
    // Count occurrences of each type to determine the dominant type
    const counts: Record<string, number> = {};
    let totalCount = 0;
    let dominantType = '';
    let maxCount = 0;
    
    for (const [type, regex] of Object.entries(patterns)) {
      const matches = text.match(regex);
      const count = matches ? matches.length : 0;
      counts[type] = count;
      totalCount += count;
      
      // Track the dominant type (the one with the highest count)
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }
    
    // If no objects were found, return a default result
    if (totalCount === 0) {
      return {
        label: 'Tipo de Objeto',
        value: 0,
      };
    }
    
    // Format the dominant type for display
    const formattedType = "tipo : " + dominantType.charAt(0).toUpperCase() + dominantType.slice(1);
    
    // Map object types to numeric codes
    const typeCodeMap: Record<string, number> = {
      class: 1,
      interface: 2,
      enum: 3,
      struct: 4,
      record: 5,
      namespace: 6,
      delegate: 7,
    };
    
    // Return the result with just the dominant type name and a type code as the value
    return {
      label: formattedType,
      value: typeCodeMap[dominantType] || 0,
    };
  },
};
