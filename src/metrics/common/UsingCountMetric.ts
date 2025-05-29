import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const UsingCountMetric: Metric = {
  name: 'usingCount',
  description: 'El número de declaraciones de uso/importación en el código (using, import, require).',

  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();

    // Split text into lines for better processing
    const lines = text.split('\n');
    let totalMatches = 0;

    // C# using statements
    const usingPattern = /^\s*using\s+\w+/;
    
    // JavaScript/TypeScript ES6 imports
    const es6ImportPattern = /^\s*import\s+[\w*{}\s,]+from\s+['"][^'"]+['"]/;
    
    // Simple imports (Java, Python simple imports, JS simple)
    const simpleImportPattern = /^\s*import\s+/;
    
    // Python from imports (including relative imports)
    const pythonFromPattern = /^\s*from\s+[.\w]+\s+import\s+/;
    
    // JavaScript CommonJS require
    const requirePattern = /\brequire\s*\(\s*['"][^'"]+['"]\s*\)/;

    let inMultilineImport = false;
    let multilineImportType = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('/*')) {
        continue;
      }

      // Handle multiline imports
      if (inMultilineImport) {
        if (multilineImportType === 'python-from' && line.includes(')')) {
          inMultilineImport = false;
          multilineImportType = '';
        } else if (multilineImportType === 'es6' && line.includes('}')) {
          inMultilineImport = false;
          multilineImportType = '';
        }
        continue;
      }

      // Check for C# using statements
      if (usingPattern.test(line)) {
        totalMatches++;
        continue;
      }

      // Check for ES6 imports
      if (es6ImportPattern.test(line)) {
        totalMatches++;
        continue;
      }

      // Check for Python from imports (including multiline)
      if (pythonFromPattern.test(line)) {
        totalMatches++;
        // Check if it's a multiline import
        if (line.includes('(') && !line.includes(')')) {
          inMultilineImport = true;
          multilineImportType = 'python-from';
        }
        continue;
      }

      // Check for simple imports (Python, Java, etc.)
      if (simpleImportPattern.test(line)) {
        totalMatches++;
        continue;
      }

      // Check for CommonJS require statements
      if (requirePattern.test(line)) {
        const matches = line.match(requirePattern);
        if (matches) {
          totalMatches += matches.length;
        }
        continue;
      }
    }

    return {
      label: 'Cantidad de declaraciones de uso/importación',
      value: totalMatches,
    };
  },
};
