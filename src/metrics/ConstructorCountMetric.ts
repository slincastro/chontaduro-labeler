import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const ConstructorCountMetric: MetricExtractor = {
  name: 'constructorCount',
  description: 'el número total de constructores definidos en el código.',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    
    // First, find all class names to identify constructors
    const classNameRegex = /\bclass\s+(\w+)/g;
    const classNames: string[] = [];
    let match;
    
    while ((match = classNameRegex.exec(text)) !== null) {
      classNames.push(match[1]);
    }
    
    if (classNames.length === 0) {
      return {
        label: 'Número de constructores',
        value: 0,
      };
    }
    
    // Create a regex pattern to match constructors for all found classes
    // A constructor has the same name as the class and is followed by parameters
    let constructorCount = 0;
    
    for (const className of classNames) {
      // Find all class declarations to identify their scope
      const classDeclarationRegex = new RegExp(`\\bclass\\s+${className}\\b[^{]*{`, 'g');
      let classMatch;
      
      while ((classMatch = classDeclarationRegex.exec(text)) !== null) {
        const startIndex = classMatch.index + classMatch[0].length;
        
        // Find the matching closing brace for this class
        let braceCount = 1;
        let endIndex = startIndex;
        
        for (let i = startIndex; i < text.length; i++) {
          if (text[i] === '{') {
            braceCount++;
          } else if (text[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              endIndex = i;
              break;
            }
          }
        }
        
        // Extract the class body
        const classBody = text.substring(startIndex, endIndex);
        
        // Find constructors in this class body
        const constructorRegex = new RegExp(`\\b${className}\\s*\\([^)]*\\)\\s*{`, 'g');
        let constructorMatch;
        let classConstructorCount = 0;
        
        while ((constructorMatch = constructorRegex.exec(classBody)) !== null) {
          classConstructorCount++;
        }
        
        constructorCount += classConstructorCount;
      }
    }
    
    return {
      label: 'Número de constructores',
      value: constructorCount,
    };
  },
};
