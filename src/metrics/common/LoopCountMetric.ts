import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const LoopCountMetric: Metric = {
  name: 'loopCount',
  description: 'El número de estructuras de bucle (for, foreach, while, do-while, forEach) en el código.',

  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const lines = text.split('\n');

    // Eliminar comentarios de una sola línea y de bloque estilo C/JS/TS/Java/C#
    const textWithoutComments = text
      .replace(/\/\/.*$/gm, '')             // Comentarios de línea
      .replace(/\/\*[\s\S]*?\*\//g, '')     // Comentarios de bloque
      .replace(/#.*$/gm, '');               // Comentarios de línea estilo Python

    const loopBlocks: { startLine: number, endLine: number, loopType: string }[] = [];

    // Regex para lenguajes tipo C/Java - más específicos para evitar falsos positivos
    const forRegex = /\bfor\b\s*\(/g;                      // for (...)
    const forEachRegex1 = /\bforeach\b\s*\(/g;             // foreach (...)
    const whileRegex = /\bwhile\b\s*\(/g;                  // while (...)
    const doWhileRegex = /\bdo\b[\s\S]*?\bwhile\b\s*\(/g;  // do { ... } while (...)
    const forEachRegex = /\.forEach\s*\(/g;                // método forEach() en JS/TS

    // Regex específicos para Python
    const pythonForRegex = /\bfor\b\s+\w+\s+in\s+.*:/g;     // for i in ...
    const pythonWhileRegex = /\bwhile\b\s+.*:/g;            // while condición:

    // Function to find loop locations in the original text
    function findLoopLocations(regex: RegExp, loopType: string, originalText: string) {
      let match;
      while ((match = regex.exec(originalText)) !== null) {
        const matchStart = match.index;
        const lineNumber = originalText.substring(0, matchStart).split('\n').length - 1;
        
        // For most loops, highlight just the line where the loop starts
        loopBlocks.push({
          startLine: lineNumber,
          endLine: lineNumber,
          loopType: loopType
        });
      }
    }

    // Find all loop locations
    findLoopLocations(forRegex, 'for', textWithoutComments);
    findLoopLocations(forEachRegex1, 'foreach', textWithoutComments);
    findLoopLocations(whileRegex, 'while', textWithoutComments);
    findLoopLocations(/\bdo\b\s*\{/g, 'do-while', textWithoutComments);
    findLoopLocations(forEachRegex, 'forEach', textWithoutComments);
    findLoopLocations(pythonForRegex, 'for-in', textWithoutComments);
    findLoopLocations(pythonWhileRegex, 'while-python', textWithoutComments);

    // Count matches in text without comments for accuracy
    const forMatches = (textWithoutComments.match(forRegex) || []).length;
    const forEachMatches1 = (textWithoutComments.match(forEachRegex1) || []).length;
    const allWhileMatches = (textWithoutComments.match(whileRegex) || []).length;
    const doWhileMatches = (textWithoutComments.match(doWhileRegex) || []).length;
    const standaloneWhileMatches = allWhileMatches - doWhileMatches;

    const forEachMatches = (textWithoutComments.match(forEachRegex) || []).length;
    const pythonForMatches = (textWithoutComments.match(pythonForRegex) || []).length;
    const pythonWhileMatches = (textWithoutComments.match(pythonWhileRegex) || []).length;

    const loopMatches =
      forMatches +
      forEachMatches1 +
      standaloneWhileMatches +
      doWhileMatches +
      forEachMatches +
      pythonForMatches +
      pythonWhileMatches;

    return {
      label: 'Cantidad de bucles',
      value: loopMatches,
      loopBlocks: loopBlocks
    };
  },
};
