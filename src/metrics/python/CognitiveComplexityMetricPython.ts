import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const CognitiveComplexityMetricPython: Metric = {
  name: 'cognitiveComplexityPython',
  description: 'Calcula la complejidad cognitiva para código Python basado en estructuras de control, anidamiento, operadores lógicos, saltos, lambdas y comprehensions.',
  hasAction: true,
  action: {
    method: 'highlightMaxDepth',
  },

  extract(document: vscode.TextDocument): MetricResult {
    /**
     * Cálculo de Complejidad Cognitiva para Python:
     * --------------------------------------------
     * Esta métrica estima el esfuerzo mental requerido para entender el flujo del código Python.
     * Se basa en las reglas de SonarSource adaptadas para Python:
     * 
     * 1. +1 por cada estructura de control:
     *    - if, elif, else, for, while, try, except, finally, with, async with
     * 
     * 2. +1 adicional por cada nivel de anidamiento de estructuras de control.
     * 
     * 3. +1 por cada uso de operadores lógicos:
     *    - and, or, not
     * 
     * 4. +1 por cada salto de flujo:
     *    - return, break, continue, raise, yield, yield from
     * 
     * 5. +2 por cada lambda detectada.
     *    - Si hay lambdas anidadas, se multiplica por el nivel de anidación.
     * 
     * 6. +2 por cada comprehension (list, set, dict, generator).
     *    - Se añade +1 por cada nivel de anidamiento.
     * 
     * 7. Se ignoran líneas en comentarios, docstrings y strings.
     * 
     * 8. Manejo especial para async/await patterns.
     * 
     * El valor final refleja la dificultad de lectura y mantenimiento del código Python.
     */

    const text = document.getText();
    const lines = text.split('\n');

    let complexity = 0;
    let nestingLevel = 0;
    let maxLine = 0;
    let inMultilineString = false;
    let stringDelimiter = '';

    // Patrones mejorados para Python
    const controlPatterns = [
      /\b(if|elif|else|for|while|try|except|finally|with|async\s+with)\b/,
      /\b(async\s+def|def)\s+\w+/,  // Funciones también añaden complejidad estructural
    ];
    
    const logicalOperatorPattern = /\b(and|or|not)\b/;
    const jumpPattern = /\b(return|break|continue|raise|yield|yield\s+from)\b/;
    const lambdaPattern = /\blambda\b/;
    
    // Patrones mejorados para comprehensions
    const comprehensionPatterns = [
      /\[.*\bfor\b.*\bin\b.*\]/,  // List comprehension
      /\{.*\bfor\b.*\bin\b.*\}/,  // Set/Dict comprehension
      /\(.*\bfor\b.*\bin\b.*\)/,  // Generator expression
    ];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmedLine = line.trim();

      // Manejar strings multilínea
      if (inMultilineString) {
        if (line.includes(stringDelimiter)) {
          inMultilineString = false;
          stringDelimiter = '';
        }
        continue;
      }

      // Detectar inicio de strings multilínea
      const multilineStringMatch = trimmedLine.match(/^.*?('''|""")/) || trimmedLine.match(/('''|""").*$/);
      if (multilineStringMatch) {
        const delimiter = multilineStringMatch[1];
        const beforeDelimiter = trimmedLine.substring(0, trimmedLine.indexOf(delimiter));
        const afterDelimiter = trimmedLine.substring(trimmedLine.indexOf(delimiter) + 3);
        
        // Si no hay otro delimitador en la misma línea, es multilínea
        if (!afterDelimiter.includes(delimiter)) {
          inMultilineString = true;
          stringDelimiter = delimiter;
          // Procesar la parte antes del delimitador si existe
          if (beforeDelimiter.trim()) {
            line = beforeDelimiter;
          } else {
            continue;
          }
        }
      }

      // Saltar comentarios y líneas vacías
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        continue;
      }

      // Remover strings de una línea para evitar falsos positivos
      line = line.replace(/(['"])(\\.|[^\\])*?\1/g, '');

      // Calcular nivel de anidamiento basado en indentación
      const indent = line.length - line.trimStart().length;
      const indentLevel = Math.floor(indent / 4); // Asumiendo 4 espacios por nivel
      
      // Ajustar nesting level basado en la indentación actual
      if (indentLevel < nestingLevel) {
        nestingLevel = indentLevel;
      }

      // Verificar estructuras de control
      let foundControlStructure = false;
      for (const pattern of controlPatterns) {
        if (pattern.test(line)) {
          complexity += 1 + nestingLevel;
          maxLine = i;
          foundControlStructure = true;
          break;
        }
      }

      // Si encontramos una estructura de control, incrementar el nivel de anidamiento
      if (foundControlStructure && line.trim().endsWith(':')) {
        nestingLevel = indentLevel + 1;
      }

      // Contar operadores lógicos
      const logicalMatches = line.match(logicalOperatorPattern);
      if (logicalMatches) {
        complexity += logicalMatches.length;
      }

      // Contar saltos de flujo
      const jumpMatches = line.match(jumpPattern);
      if (jumpMatches) {
        complexity += jumpMatches.length;
      }

      // Contar lambdas
      const lambdaMatches = line.match(lambdaPattern);
      if (lambdaMatches) {
        complexity += lambdaMatches.length * 2 * Math.max(1, nestingLevel);
        maxLine = i;
      }

      // Contar comprehensions
      for (const pattern of comprehensionPatterns) {
        const comprehensionMatches = line.match(pattern);
        if (comprehensionMatches) {
          complexity += comprehensionMatches.length * (2 + nestingLevel);
          maxLine = i;
        }
      }

      // Manejar casos especiales de async/await
      if (/\bawait\b/.test(line)) {
        complexity += 1;
      }
    }

    return {
      label: 'Complejidad Cognitiva estimada (Python)',
      value: complexity,
      lineNumber: maxLine,
    };
  },
};
