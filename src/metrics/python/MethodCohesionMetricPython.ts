import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const MethodCohesionMetricPython: Metric = {
  name: 'methodCohesionPython',
  description: 'Cohesión de métodos en clases Python basada en el uso de atributos de instancia (self).',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const lines = text.split('\n');

    // Verificar si hay contenido en el documento
    if (lines.length === 0) {
      return {
        label: 'Cohesión promedio de métodos (%)',
        value: 0,
      };
    }

    // Detectar clases en el documento - mejorado para capturar más variantes
    const classRegex = /^\s*class\s+(\w+)(?:\s*\([\w\s,.]*\))?\s*:/;
    const classes: { name: string, startLine: number, endLine: number, indent: number }[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Ignorar líneas de comentario
      if (line.trim().startsWith('#')) continue;
      
      const classMatch = line.match(classRegex);
      if (classMatch) {
        const className = classMatch[1];
        const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
        
        // Encontrar el final de la clase (primera línea con indentación igual o menor)
        let endLine = lines.length - 1;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (nextLine.trim() === '' || nextLine.trim().startsWith('#')) continue;
          
          const lineIndent = nextLine.match(/^(\s*)/)?.[1].length ?? 0;
          if (lineIndent <= indent && nextLine.trim() !== '') {
            endLine = j - 1;
            break;
          }
        }
        
        classes.push({
          name: className,
          startLine: i,
          endLine: endLine,
          indent: indent
        });
      }
    }

    // Si no hay clases, no hay cohesión que medir
    if (classes.length === 0) {
      return {
        label: 'Cohesión promedio de métodos (%)',
        value: 0,
      };
    }

    // Analizar cada clase
    let totalCohesion = 0;
    let totalMethods = 0;
    const allMethodBlocks: { startLine: number, endLine: number, name: string, size: number }[] = [];

    for (const classInfo of classes) {
      const classLines = lines.slice(classInfo.startLine, classInfo.endLine + 1);
      const classIndent = classInfo.indent;
      
      // === Paso 1: Extraer todos los atributos de instancia ===
      const instanceAttributes: Set<string> = new Set();
      
      // 1.1 Buscar atributos definidos en __init__
      const initRegex = /^\s*def\s+__init__\s*\(/;
      let inInit = false;
      let initIndent = 0;
      
      for (let i = 0; i < classLines.length; i++) {
        const line = classLines[i];
        if (line.trim() === '' || line.trim().startsWith('#')) continue;
        
        const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
        
        // Detectar inicio de __init__
        if (!inInit && initRegex.test(line)) {
          inInit = true;
          initIndent = lineIndent;
          continue;
        }
        
        // Dentro de __init__, buscar self.attr = ...
        if (inInit) {
          if (lineIndent <= initIndent && line.trim() !== '') {
            inInit = false;
            continue;
          }
          
          // Capturar atributos definidos como self.attr = ...
          const attrMatches = line.match(/\bself\.(\w+)\s*=/g);
          if (attrMatches) {
            attrMatches.forEach(match => {
              const attr = match.match(/\bself\.(\w+)\s*=/)?.[1];
              if (attr) instanceAttributes.add(attr);
            });
          }
        }
      }
      
      // 1.2 Buscar atributos definidos en otros métodos
      const methodAttrRegex = /\bself\.(\w+)\s*=/g;
      for (let i = 0; i < classLines.length; i++) {
        const line = classLines[i];
        if (line.trim().startsWith('#')) continue;
        
        const matches = [...line.matchAll(methodAttrRegex)];
        for (const match of matches) {
          if (match[1]) instanceAttributes.add(match[1]);
        }
      }
      
      // 1.3 Buscar atributos de clase (variables de clase)
      const classAttrRegex = /^\s+(\w+)\s*=/;
      for (let i = 0; i < classLines.length; i++) {
        const line = classLines[i];
        if (line.trim().startsWith('#')) continue;
        
        const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
        
        // Solo considerar líneas con indentación correcta (dentro de la clase pero fuera de métodos)
        if (lineIndent > classIndent && !line.trim().startsWith('def ')) {
          const match = line.match(classAttrRegex);
          if (match && match[1]) {
            instanceAttributes.add(match[1]);
          }
        }
      }
      
      // Si no encontramos atributos, agregar algunos predeterminados para evitar división por cero
      if (instanceAttributes.size === 0) {
        instanceAttributes.add('_default_attr');
      }
      
      const totalProps = instanceAttributes.size;
      
      // === Paso 2: Analizar métodos y su cohesión ===
      // Mejorado para manejar decoradores y firmas multilínea
      const methodRegex = /^\s*def\s+(\w+)\s*\(/;
      const methodBlocks: { startLine: number, endLine: number, name: string, cohesion: number }[] = [];
      let insideMethod = false;
      let methodName = '';
      let methodStartLine = -1;
      let methodIndent = 0;
      let currentMethodBody: string[] = [];
      let methodsCohesion: number[] = [];
      let inDecorator = false;
      
      for (let i = 0; i < classLines.length; i++) {
        const line = classLines[i];
        if (line.trim() === '' || line.trim().startsWith('#')) continue;
        
        const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
        const trimmedLine = line.trim();
        
        // Detectar decoradores
        if (lineIndent > classIndent && trimmedLine.startsWith('@')) {
          inDecorator = true;
          continue;
        }
        
        // Detectar inicio de método
        const methodMatch = line.match(methodRegex);
        if (methodMatch && !insideMethod) {
          methodName = methodMatch[1];
          
          // Ignorar __init__ y métodos especiales
          if (methodName === '__init__' || (methodName.startsWith('__') && methodName.endsWith('__'))) {
            inDecorator = false;
            continue;
          }
          
          insideMethod = true;
          methodStartLine = classInfo.startLine + i;
          methodIndent = lineIndent;
          currentMethodBody = [line];
          inDecorator = false;
          continue;
        }
        
        // Dentro de un método
        if (insideMethod) {
          // Verificar si salimos del método (indentación igual o menor)
          if (lineIndent <= methodIndent && trimmedLine !== '') {
            // Analizar el cuerpo del método
            const bodyText = currentMethodBody.join('\n');
            const usedProps = Array.from(instanceAttributes).filter(prop =>
              new RegExp(`\\bself\\.${prop}\\b`).test(bodyText)
            );
            
            const cohesion = totalProps > 0 ? usedProps.length / totalProps : 0;
            methodsCohesion.push(cohesion);
            
            // Guardar información del método
            const methodEndLine = classInfo.startLine + i - 1;
            methodBlocks.push({
              startLine: methodStartLine,
              endLine: methodEndLine,
              name: methodName,
              cohesion: cohesion
            });
            
            insideMethod = false;
            i--; // Retroceder para procesar esta línea de nuevo
          } else {
            currentMethodBody.push(line);
          }
        }
      }
      
      // Procesar el último método si termina al final de la clase
      if (insideMethod && currentMethodBody.length > 0) {
        const bodyText = currentMethodBody.join('\n');
        const usedProps = Array.from(instanceAttributes).filter(prop =>
          new RegExp(`\\bself\\.${prop}\\b`).test(bodyText)
        );
        
        const cohesion = totalProps > 0 ? usedProps.length / totalProps : 0;
        methodsCohesion.push(cohesion);
        
        // Guardar información del método
        methodBlocks.push({
          startLine: methodStartLine,
          endLine: classInfo.endLine,
          name: methodName,
          cohesion: cohesion
        });
      }
      
      // Calcular cohesión promedio para esta clase
      if (methodsCohesion.length > 0) {
        const classCohesion = methodsCohesion.reduce((acc, val) => acc + val, 0);
        totalCohesion += classCohesion;
        totalMethods += methodsCohesion.length;
        
        // Agregar métodos al resultado global
        methodBlocks.forEach(block => {
          allMethodBlocks.push({
            startLine: block.startLine,
            endLine: block.endLine,
            name: block.name,
            size: block.endLine - block.startLine + 1
          });
        });
      }
    }
    
    // Calcular cohesión promedio global
    const avgCohesion = totalMethods === 0
      ? 0
      : Math.round((totalCohesion / totalMethods) * 100);
    
    // Ordenar métodos por cohesión (de menor a mayor)
    allMethodBlocks.sort((a, b) => {
      const methodA = a as unknown as { cohesion: number };
      const methodB = b as unknown as { cohesion: number };
      return methodA.cohesion - methodB.cohesion;
    });

    // Asegurarse de que siempre devolvemos un valor, incluso si es 0
    return {
      label: 'Cohesión promedio de métodos (%)',
      value: avgCohesion || 0,
      methodBlocks: allMethodBlocks
    };
  },
};
