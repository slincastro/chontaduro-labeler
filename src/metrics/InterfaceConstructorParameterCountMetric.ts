import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const InterfaceConstructorParameterCountMetric: MetricExtractor = {
  name: 'interfaceConstructorParameterCount',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    
    // Find all interfaces
    const interfaceRegex = /\binterface\s+(\w+)(?:<[^>]*>)?\s*{([^}]*)}/gs;
    let interfaceMatch;
    let totalParameterCount = 0;
    
    while ((interfaceMatch = interfaceRegex.exec(text)) !== null) {
      const interfaceName = interfaceMatch[1];
      const interfaceBody = interfaceMatch[2];
      
      // Find constructors in the interface (same name as interface)
      const constructorRegex = new RegExp(`\\b${interfaceName}\\s*\\(([^)]*)\\)`, 'g');
      let constructorMatch;
      
      while ((constructorMatch = constructorRegex.exec(interfaceBody)) !== null) {
        const parameters = constructorMatch[1].trim();
        
        // Count parameters (if any)
        if (parameters.length > 0) {
          // For complex parameter types like List<string>, Dictionary<int, object>
          // we need to count parameters carefully, not just by commas
          let paramCount = 0;
          let angleBracketDepth = 0;
          let currentParam = '';
          
          for (let i = 0; i < parameters.length; i++) {
            const char = parameters[i];
            
            if (char === '<') {
              angleBracketDepth++;
              currentParam += char;
            } else if (char === '>') {
              angleBracketDepth--;
              currentParam += char;
            } else if (char === ',' && angleBracketDepth === 0) {
              // Only count commas outside angle brackets as parameter separators
              if (currentParam.trim().length > 0) {
                paramCount++;
              }
              currentParam = '';
            } else {
              currentParam += char;
            }
          }
          
          // Don't forget the last parameter
          if (currentParam.trim().length > 0) {
            paramCount++;
          }
          
          totalParameterCount += paramCount;
        }
      }
    }
    
    return {
      label: 'Parámetros de constructores de interfaces',
      value: totalParameterCount,
    };
  },
};
