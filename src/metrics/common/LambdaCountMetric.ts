import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const LambdaCountMetric: Metric = {
  name: 'lambdaCount',
  description: 'El número de expresiones lambda en el código.',
  hasAction: true,
  action: {
    method: 'highlightLambdas'
  },
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const languageId = document.languageId;
    let lambdaCount = 0;
    const lambdaLocations: { startLine: number, endLine: number, size: number, name?: string }[] = [];
    
    // Estado para rastrear comentarios multilinea
    let inMultilineComment = false;
    
    // Configuración específica por lenguaje
    const config = getLambdaConfigForLanguage(languageId);
    
    // Procesar línea por línea
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text;
      
      // Actualizar estado de comentarios multilinea
      if (config.multilineCommentStart && config.multilineCommentEnd) {
        if (!inMultilineComment && line.includes(config.multilineCommentStart)) {
          inMultilineComment = !line.includes(config.multilineCommentEnd, 
            line.indexOf(config.multilineCommentStart) + config.multilineCommentStart.length);
        } else if (inMultilineComment) {
          if (line.includes(config.multilineCommentEnd)) {
            inMultilineComment = false;
          }
          continue; // Saltar líneas dentro de comentarios multilinea
        }
      }
      
      // Saltar líneas vacías o comentarios
      if (
        line.trim() === '' ||
        (config.lineComment && line.trim().startsWith(config.lineComment)) ||
        (config.multilineCommentStart && line.trim().startsWith(config.multilineCommentStart)) ||
        (config.docCommentPrefix && line.trim().startsWith(config.docCommentPrefix))
      ) {
        continue;
      }
      
      // Procesar la línea para encontrar lambdas
      const cleanedLine = removeStringsAndComments(line, config);
      if (!cleanedLine) {
        continue;
      }
      
      // Buscar expresiones lambda
      let match;
      while ((match = config.lambdaRegex.exec(cleanedLine)) !== null) {
        // Verificar que no sea un falso positivo
        if (config.validateMatch && !config.validateMatch(cleanedLine, match)) {
          continue;
        }
        
        lambdaCount++;
        
        // Extraer información para el nombre de la lambda
        let lambdaName = 'lambda';
        if (config.extractLambdaName) {
          lambdaName = config.extractLambdaName(cleanedLine, match) || 'lambda';
        }
        
        // Determinar el tamaño de la lambda (por defecto 1 línea)
        let lambdaSize = 1;
        let endLine = i;
        
        // Si el lenguaje soporta lambdas multilinea, intentar detectar el final
        if (config.multilineLambdaSupport) {
          const lambdaEndInfo = findLambdaEnd(document, i, config);
          if (lambdaEndInfo) {
            endLine = lambdaEndInfo.endLine;
            lambdaSize = endLine - i + 1;
          }
        }
        
        lambdaLocations.push({
          startLine: i,
          endLine: endLine,
          size: lambdaSize,
          name: lambdaName
        });
      }
    }
    
    return {
      label: 'Expresiones lambda',
      value: lambdaCount,
      methodBlocks: lambdaLocations // Usar methodBlocks para mostrar ubicaciones
    };
  },
};

/**
 * Configuración para detección de lambdas según el lenguaje
 */
interface LambdaConfig {
  lambdaRegex: RegExp;
  lineComment?: string;
  multilineCommentStart?: string;
  multilineCommentEnd?: string;
  docCommentPrefix?: string;
  stringDelimiters: string[];
  multilineLambdaSupport?: boolean;
  validateMatch?: (line: string, match: RegExpExecArray) => boolean;
  extractLambdaName?: (line: string, match: RegExpExecArray) => string | undefined;
}

/**
 * Obtiene la configuración específica para el lenguaje
 * @param languageId Identificador del lenguaje de programación
 * @returns Configuración para la detección de lambdas en el lenguaje especificado
 */
function getLambdaConfigForLanguage(languageId: string): LambdaConfig {
  switch (languageId) {
    case 'java':
      return {
        lambdaRegex: /(\(.*?\)|[a-zA-Z_][a-zA-Z0-9_]*)\s*->/g,
        lineComment: '//',
        multilineCommentStart: '/*',
        multilineCommentEnd: '*/',
        docCommentPrefix: '*',
        stringDelimiters: ['"', "'"],
        multilineLambdaSupport: true,
        extractLambdaName: (line, match) => {
          return match[1] ? `lambda(${match[1]})` : 'lambda';
        }
      };
    case 'csharp':
      return {
        lambdaRegex: /(\(.*?\)|[a-zA-Z_][a-zA-Z0-9_]*)\s*=>/g,
        lineComment: '//',
        multilineCommentStart: '/*',
        multilineCommentEnd: '*/',
        docCommentPrefix: '///',
        stringDelimiters: ['"', "'", "@\""],
        multilineLambdaSupport: true,
        validateMatch: (line, match) => {
          // Evitar confundir con operadores de comparación o anotaciones de tipo
          const pos = match.index + match[0].length - 2; // Posición del "="
          return !(pos > 0 && line[pos - 1] === '=' || line[pos - 1] === '<');
        },
        extractLambdaName: (line, match) => {
          return match[1] ? `lambda(${match[1]})` : 'lambda';
        }
      };
    case 'python':
      return {
        lambdaRegex: /\blambda\b/g,
        lineComment: '#',
        multilineCommentStart: '"""',
        multilineCommentEnd: '"""',
        stringDelimiters: ['"', "'", '"""', "'''"],
        multilineLambdaSupport: false,
        validateMatch: (line, match) => {
          // Verificar que sea una expresión lambda válida
          const colonPos = line.indexOf(':', match.index);
          return colonPos > match.index;
        },
        extractLambdaName: (line, match) => {
          // Intentar extraer los parámetros
          const lambdaStart = match.index;
          const colonPos = line.indexOf(':', lambdaStart);
          if (colonPos > lambdaStart) {
            const params = line.substring(lambdaStart + 'lambda'.length, colonPos).trim();
            return `lambda ${params}`;
          }
          return 'lambda';
        }
      };
    case 'javascript':
    case 'typescript':
    case 'javascriptreact':
    case 'typescriptreact':
      return {
        lambdaRegex: /(\(.*?\)|[a-zA-Z_][a-zA-Z0-9_]*)\s*=>/g,
        lineComment: '//',
        multilineCommentStart: '/*',
        multilineCommentEnd: '*/',
        docCommentPrefix: '/**',
        stringDelimiters: ['"', "'", '`'],
        multilineLambdaSupport: true,
        validateMatch: (line, match) => {
          // Evitar confundir con operadores de comparación o anotaciones de tipo
          const pos = match.index + match[0].length - 2; // Posición del "="
          return !(pos > 0 && (line[pos - 1] === '=' || line[pos - 1] === '<'));
        },
        extractLambdaName: (line, match) => {
          // Intentar extraer nombre de asignación: const name = () => {}
          const beforeMatch = line.substring(0, match.index).trim();
          const assignmentMatch = /\b(const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*$/.exec(beforeMatch);
          if (assignmentMatch) {
            return assignmentMatch[2];
          }
          return match[1] ? `lambda(${match[1]})` : 'lambda';
        }
      };
    default:
      // Configuración genérica para otros lenguajes
      return {
        lambdaRegex: /=>/g,
        lineComment: '//',
        stringDelimiters: ['"', "'"],
        multilineLambdaSupport: false
      };
  }
}

/**
 * Elimina strings y comentarios de una línea para evitar falsos positivos
 * @param line Línea de código a procesar
 * @param config Configuración del lenguaje
 * @returns Línea limpia sin strings ni comentarios
 */
function removeStringsAndComments(line: string, config: LambdaConfig): string {
  // Eliminar comentarios de línea
  if (config.lineComment) {
    const commentIndex = line.indexOf(config.lineComment);
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex);
    }
  }
  
  // Eliminar strings
  let result = '';
  let inString = false;
  let stringDelimiter = '';
  let escaped = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    // Verificar inicio/fin de string
    if (!inString) {
      const isStringStart = config.stringDelimiters.some(delimiter => {
        if (delimiter.length === 1) {
          return char === delimiter;
        } else {
          return line.substring(i, i + delimiter.length) === delimiter;
        }
      });
      
      if (isStringStart) {
        inString = true;
        stringDelimiter = char;
        continue;
      }
    } else if (char === stringDelimiter) {
      inString = false;
      continue;
    }
    
    if (!inString) {
      result += char;
    }
  }
  
  return result;
}

/**
 * Encuentra el final de una expresión lambda multilinea
 * @param document Documento de texto
 * @param startLine Línea de inicio de la lambda
 * @param config Configuración del lenguaje
 * @returns Objeto con la línea final de la lambda o undefined si no se encuentra
 */
function findLambdaEnd(document: vscode.TextDocument, startLine: number, config: LambdaConfig): 
  { endLine: number } | undefined {
  
  let openBraces = 0;
  let foundOpenBrace = false;
  
  // Buscar la primera llave de apertura
  for (let i = startLine; i < document.lineCount; i++) {
    const line = document.lineAt(i).text;
    const cleanedLine = removeStringsAndComments(line, config);
    
    if (cleanedLine.includes('{')) {
      foundOpenBrace = true;
      openBraces += (cleanedLine.match(/{/g) || []).length;
      openBraces -= (cleanedLine.match(/}/g) || []).length;
      
      if (openBraces === 0 && foundOpenBrace) {
        return { endLine: i };
      }
    } else if (foundOpenBrace) {
      openBraces -= (cleanedLine.match(/}/g) || []).length;
      
      if (openBraces === 0) {
        return { endLine: i };
      }
    } else if (i > startLine && !cleanedLine.includes('=>') && !cleanedLine.includes('->')) {
      // Si no encontramos una llave de apertura y estamos en una línea que no continúa la lambda,
      // asumimos que es una lambda de una sola línea
      return { endLine: startLine };
    }
  }
  
  // Si no encontramos el final, asumimos que termina en la misma línea
  return foundOpenBrace ? { endLine: document.lineCount - 1 } : { endLine: startLine };
}
