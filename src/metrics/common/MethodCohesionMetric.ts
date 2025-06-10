import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const MethodCohesionMetric: Metric = {
  name: 'methodCohesion',
  description: 'Qué tan bien los métodos están relacionados entre sí en términos del uso de campos o propiedades.',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const lines = text.split('\n');
    const languageId = document.languageId;

    // === 1. Detectar campos o propiedades por lenguaje ===
    let propertyRegex: RegExp;
    let constructorRegex: RegExp;

    switch (languageId) {
      case 'csharp':
        // Mejorado para capturar más variantes de propiedades en C#
        propertyRegex = /^\s*(public|private|protected|internal)?\s*(static|readonly|const)?\s*[\w<>\[\],\.]+\s+(\w+)\s*(\{?\s*get;?\s*set;?\s*\}?;?|=|;)/gm;
        constructorRegex = /^\s*(public|private|protected|internal)?\s*(\w+)\s*\([^)]*\)\s*(?::\s*base\([^)]*\))?\s*{/;
        break;
      case 'java':
        // Mejorado para capturar más variantes de propiedades en Java
        propertyRegex = /^\s*(public|private|protected)?\s*(static|final)?\s*[\w<>\[\],\.]+\s+(\w+)\s*(=|;)/gm;
        constructorRegex = /^\s*(public|private|protected)?\s*(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*{/;
        break;
      case 'typescript':
      case 'javascript':
        // Mejorado para capturar más variantes de propiedades en TS/JS
        propertyRegex = /^\s*(public|private|protected|readonly)?\s*(static|readonly)?\s*(?:#)?(\w+)\s*[:=]/gm;
        // También capturar propiedades definidas en constructor
        constructorRegex = /^\s*(public|private|protected)?\s*constructor\s*\([^)]*\)\s*{/;
        break;
      default:
        return {
          label: 'Cohesión promedio de métodos (%)',
          value: 0,
        };
    }

    // Extraer propiedades declaradas normalmente
    const classProperties = new Set<string>();
    
    // Extraer propiedades de declaraciones normales
    Array.from(text.matchAll(propertyRegex)).forEach(match => {
      // El nombre puede estar en distintas posiciones según regex
      const propName = match[3] || match[4];
      if (propName) classProperties.add(propName);
    });

    // Extraer propiedades definidas en constructores (this.prop = value)
    const constructorPropRegex = /\b(this|self)\.(\w+)\s*=/g;
    let inConstructor = false;
    let constructorBraceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (!inConstructor && constructorRegex.test(line)) {
        inConstructor = true;
        constructorBraceCount = 1;
        continue;
      }
      
      if (inConstructor) {
        constructorBraceCount += (line.match(/{/g) || []).length;
        constructorBraceCount -= (line.match(/}/g) || []).length;
        
        // Buscar propiedades definidas con this.prop = value
        const matches = [...line.matchAll(constructorPropRegex)];
        for (const match of matches) {
          if (match[2]) classProperties.add(match[2]);
        }
        
        if (constructorBraceCount === 0) {
          inConstructor = false;
        }
      }
    }

    const totalProperties = classProperties.size;

    if (totalProperties === 0) {
      return {
        label: 'Cohesión promedio de métodos (%)',
        value: 0,
      };
    }

    // === 2. Detectar métodos con mejor soporte para firmas multilínea ===
    const methodRegex = /^\s*(public|private|protected|internal)?\s*(static|async|override|virtual|abstract|new|final)?\s*[\w<>\[\],\.]+\s+(\w+)\s*\(/;
    const methodBlocks: { startLine: number, endLine: number, name: string, cohesion: number }[] = [];
    let methodStartLine = -1;
    let methodName = '';
    let insideMethod = false;
    let braceCount = 0;
    let currentMethodBody: string[] = [];
    let methodsCohesion: number[] = [];
    let inComment = false;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Manejar comentarios multilínea
      if (!inComment && trimmedLine.includes('/*')) inComment = true;
      if (inComment && trimmedLine.includes('*/')) inComment = false;
      if (inComment) continue;

      // Ignorar líneas de comentario
      if (trimmedLine.startsWith('//')) continue;

      if (!insideMethod) {
        const methodMatch = line.match(methodRegex);
        if (methodMatch && !line.includes(';')) { // Excluir declaraciones de método sin cuerpo
          methodName = methodMatch[3];
          methodStartLine = i;
          
          // Buscar la apertura de llave para el cuerpo del método
          let j = i;
          let foundBrace = false;
          
          while (j < lines.length && !foundBrace) {
            // Ignorar comentarios
            if (lines[j].trim().startsWith('//')) {
              j++;
              continue;
            }
            
            if (lines[j].includes('{')) {
              foundBrace = true;
              insideMethod = true;
              braceCount = 1;
              currentMethodBody = [lines[j]];
              i = j;
              break;
            }
            j++;
          }
          
          if (!foundBrace) continue; // No se encontró la apertura del método
        }
      } else {
        // Manejar strings para evitar contar llaves dentro de strings
        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          
          // Manejar escape de caracteres en strings
          if (inString && line[c-1] === '\\') continue;
          
          if (!inString && (char === '"' || char === "'")) {
            inString = true;
            stringChar = char;
          } else if (inString && char === stringChar) {
            inString = false;
          }
          
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }
        }
        
        currentMethodBody.push(line);

        if (braceCount === 0) {
          const bodyText = currentMethodBody.join('\n');

          const usedProperties = Array.from(classProperties).filter(prop =>
            // Mejorar la detección para evitar falsos positivos
            new RegExp(`\\b(this\\.)?${prop}\\b`).test(bodyText)
          );

          const cohesion = usedProperties.length / totalProperties;
          methodsCohesion.push(cohesion);
          
          // Guardar información del método para el reporte
          methodBlocks.push({
            startLine: methodStartLine,
            endLine: i,
            name: methodName,
            cohesion: cohesion
          });
          
          insideMethod = false;
          inString = false;
        }
      }
    }

    const avgCohesion = methodsCohesion.length === 0
      ? 0
      : Math.round((methodsCohesion.reduce((acc, val) => acc + val, 0) / methodsCohesion.length) * 100);

    // Ordenar métodos por cohesión (de menor a mayor)
    methodBlocks.sort((a, b) => a.cohesion - b.cohesion);

    return {
      label: 'Cohesión promedio de métodos (%)',
      value: avgCohesion || 0, // Asegurar que siempre devolvemos un valor, incluso si es 0
      methodBlocks: methodBlocks.map(block => ({
        startLine: block.startLine,
        endLine: block.endLine,
        name: block.name,
        size: block.endLine - block.startLine + 1
      }))
    };
  },
};
