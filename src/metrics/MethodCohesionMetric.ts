import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const MethodCohesionMetric: MetricExtractor = {
  name: 'methodCohesion',
  description: 'qué tan bien los métodos están relacionados entre sí.',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const lines = text.split('\n');

    // Paso 1: Detectar propiedades de clase
    const classPropertiesRegex = /^\s*(public|private|protected|internal)?\s*(static)?\s*[\w<>\[\],]+\s+(\w+)\s*\{?\s*get;?\s*set;?\s*\}?;?/gm;
    const classProperties = Array.from(text.matchAll(classPropertiesRegex)).map(match => match[3]);

    const totalProperties = classProperties.length;
    if (totalProperties === 0) {
      return {
        label: 'Cohesión de métodos',
        value: 0,
      };
    }

    // Paso 2: Detectar métodos
    const methodRegex = /^\s*(public|private|protected|internal)?\s*(static|virtual|override|async|new)?\s+[\w<>\[\],]+\s+(\w+)\s*\([^)]*\)\s*{?/;
    let insideMethod = false;
    let braceCount = 0;
    let currentMethodBody: string[] = [];
    let methodsCohesion: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detectar inicio de método
      if (!insideMethod && methodRegex.test(line)) {
        let j = i;
        while (j < lines.length && !lines[j].includes('{')) {
          j++;
        }

        if (j < lines.length) {
          insideMethod = true;
          braceCount = 1;
          currentMethodBody = [];
          currentMethodBody.push(lines[j]);
          i = j;
          continue;
        }
      }

      // Recolectar cuerpo del método
      if (insideMethod) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        currentMethodBody.push(lines[i]);

        if (braceCount === 0) {
          const bodyText = currentMethodBody.join('\n');
          const usedProperties = classProperties.filter(prop =>
            new RegExp(`\\b${prop}\\b`).test(bodyText)
          );
          const cohesion = usedProperties.length / totalProperties;
          methodsCohesion.push(cohesion);
          insideMethod = false;
        }
      }
    }

    const avgCohesion = methodsCohesion.length === 0
      ? 0
      : Math.round((methodsCohesion.reduce((acc, val) => acc + val, 0) / methodsCohesion.length) * 100);

    return {
      label: 'Cohesión de métodos',
      value: avgCohesion,
    };
  },
};
