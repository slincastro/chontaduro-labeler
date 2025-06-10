import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const ConstructorCountMetric: Metric = {
  name: 'constructorCount',
  description: 'El número total de constructores definidos en el código.',
  hasAction: true,
  action: {
    method: 'highlightConstructors()'
  },
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const languageId = document.languageId;
    let constructorCount = 0;
    const constructorBlocks: { startLine: number, endLine: number, name?: string }[] = [];

    if (languageId === 'javascript' || languageId === 'typescript') {
      // JS/TS: busca constructor() dentro de class { ... }
      const classRegex = /\bclass\s+(\w+)[^{]*{([\s\S]*?)}\s*/g;
      let match;

      while ((match = classRegex.exec(text)) !== null) {
        const className = match[1];
        const classBody = match[2];
        const constructorRegex = /\bconstructor\s*\(.*?\)\s*{/g;
        const constructors = classBody.match(constructorRegex);
        
        if (constructors) {
          constructorCount += constructors.length;
          
          // Find the line numbers for each constructor
          const lines = text.substring(0, match.index + match[0].indexOf(classBody)).split('\n');
          const startLineOffset = lines.length - 1;
          
          const constructorMatches = [...classBody.matchAll(/\bconstructor\s*\(.*?\)\s*{/g)];
          for (const constructorMatch of constructorMatches) {
            const constructorText = classBody.substring(0, constructorMatch.index);
            const constructorLines = constructorText.split('\n');
            const startLine = startLineOffset + constructorLines.length - 1;
            
            // Find the end of the constructor (matching braces)
            const constructorBodyStart = constructorMatch.index + constructorMatch[0].length;
            let braceCount = 1;
            let endIndex = constructorBodyStart;
            
            for (let i = constructorBodyStart; i < classBody.length; i++) {
              if (classBody[i] === '{') braceCount++;
              else if (classBody[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endIndex = i;
                  break;
                }
              }
            }
            
            const constructorBodyText = classBody.substring(constructorBodyStart, endIndex);
            const bodyLines = constructorBodyText.split('\n');
            const endLine = startLine + bodyLines.length;
            
            constructorBlocks.push({
              startLine,
              endLine,
              name: `Constructor de ${className}`
            });
          }
        }
      }

    } else {
      // Java/C#: método con el mismo nombre que la clase
      const classNameRegex = /\bclass\s+(\w+)/g;
      const classNames: string[] = [];
      let match;

      while ((match = classNameRegex.exec(text)) !== null) {
        classNames.push(match[1]);
      }

      for (const className of classNames) {
        const classDeclarationRegex = new RegExp(`\\bclass\\s+${className}\\b[^{]*{`, 'g');
        let classMatch;

        while ((classMatch = classDeclarationRegex.exec(text)) !== null) {
          const startIndex = classMatch.index + classMatch[0].length;

          let braceCount = 1;
          let endIndex = startIndex;

          for (let i = startIndex; i < text.length; i++) {
            if (text[i] === '{') braceCount++;
            else if (text[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIndex = i;
                break;
              }
            }
          }

          const classBody = text.substring(startIndex, endIndex);
          const constructorRegex = new RegExp(`\\b${className}\\s*\\(.*?\\)\\s*{`, 'g');
          const constructors = classBody.match(constructorRegex);
          
          if (constructors) {
            constructorCount += constructors.length;
            
            // Find the line numbers for each constructor
            const lines = text.substring(0, classMatch.index + classMatch[0].length).split('\n');
            const startLineOffset = lines.length - 1;
            
            const constructorMatches = [...classBody.matchAll(new RegExp(`\\b${className}\\s*\\(.*?\\)\\s*{`, 'g'))];
            for (const constructorMatch of constructorMatches) {
              const constructorText = classBody.substring(0, constructorMatch.index);
              const constructorLines = constructorText.split('\n');
              const startLine = startLineOffset + constructorLines.length - 1;
              
              // Find the end of the constructor (matching braces)
              const constructorBodyStart = constructorMatch.index + constructorMatch[0].length;
              let braceCount = 1;
              let endIndex = constructorBodyStart;
              
              for (let i = constructorBodyStart; i < classBody.length; i++) {
                if (classBody[i] === '{') braceCount++;
                else if (classBody[i] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    endIndex = i;
                    break;
                  }
                }
              }
              
              const constructorBodyText = classBody.substring(constructorBodyStart, endIndex);
              const bodyLines = constructorBodyText.split('\n');
              const endLine = startLine + bodyLines.length;
              
              constructorBlocks.push({
                startLine,
                endLine,
                name: `Constructor de ${className}`
              });
            }
          }
        }
      }
    }

    return {
      label: 'Número de constructores',
      value: constructorCount,
      constructorBlocks
    };
  },
};
