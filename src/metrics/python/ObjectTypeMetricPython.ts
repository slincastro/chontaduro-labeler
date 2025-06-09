import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const ObjectTypeMetricPython: Metric = {
  name: 'objectTypePython',
  description: 'Identifica el tipo de objeto predominante en un archivo Python.',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();

    // Patrones para objetos relevantes en Python
    const patterns = {
      class: /^\s*class\s+\w+\s*(\([\w\s,]*\))?\s*:/gm,
      function: /^\s*def\s+\w+\s*\(.*\)\s*:/gm,
      decorator: /^\s*@\w+/gm,
    };

    const counts: Record<string, number> = {};
    let totalCount = 0;
    let dominantType = '';
    let maxCount = 0;

    for (const [type, regex] of Object.entries(patterns)) {
      const matches = text.match(regex);
      const count = matches ? matches.length : 0;
      counts[type] = count;
      totalCount += count;

      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    if (totalCount === 0) {
      return {
        label: 'Tipo de Objeto',
        value: 0,
      };
    }

    // If there's at least one class, prioritize it as the main object type
    if (counts['class'] > 0) {
      return {
        label: " tipo de objeto : Class",
        value: 1,
      };
    }
    
    // Only consider it as "VariosObjetos" if there are multiple types without a class
    const typesPresent = Object.entries(counts).filter(([_, count]) => count > 0);
    if (typesPresent.length > 1) {
      return {
        label: " tipo de objeto : VariosObjetos",
        value: 4, // Code for multiple object types
      };
    }

    const formattedType = dominantType.charAt(0).toUpperCase() + dominantType.slice(1);

    // Asignación de códigos
    const typeCodeMap: Record<string, number> = {
      class: 1,
      function: 2,
      decorator: 3,
    };

    return {
      label: " tipo de objeto : " + formattedType,
      value: typeCodeMap[dominantType] || 0,
    };
  },
};
