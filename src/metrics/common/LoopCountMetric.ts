import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const LoopCountMetric: Metric = {
  name: 'loopCount',
  description: 'El número de estructuras de bucle (for, foreach, while, do-while, forEach) en el código.',

  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();

    // Eliminar comentarios de una sola línea y de bloque estilo C/JS/TS/Java/C#
    const textWithoutComments = text
      .replace(/\/\/.*$/gm, '')             // Comentarios de línea
      .replace(/\/\*[\s\S]*?\*\//g, '')     // Comentarios de bloque
      .replace(/#.*$/gm, '');               // Comentarios de línea estilo Python

    // Regex para lenguajes tipo C/Java
    const forRegex = /\bfor\b\s*(\(|each\b)?/g;            // for y foreach (C#, Java)
    const whileRegex = /\bwhile\b\s*(\()?/g;               // while
    const doWhileRegex = /\bdo\b[\s\S]*?\bwhile\b\s*\(/g;  // do { ... } while (...)
    const forEachRegex = /\.forEach\s*\(/g;                // método forEach() en JS/TS

    // Regex específicos para Python
    const pythonForRegex = /\bfor\b\s+\w+\s+in\s+.*:/g;     // for i in ...
    const pythonWhileRegex = /\bwhile\b\s+.*:/g;            // while condición:

    // Contar coincidencias
    const forMatches = (textWithoutComments.match(forRegex) || []).length;
    const allWhileMatches = (textWithoutComments.match(whileRegex) || []).length;
    const doWhileMatches = (textWithoutComments.match(doWhileRegex) || []).length;
    const standaloneWhileMatches = allWhileMatches - doWhileMatches;

    const forEachMatches = (textWithoutComments.match(forEachRegex) || []).length;
    const pythonForMatches = (textWithoutComments.match(pythonForRegex) || []).length;
    const pythonWhileMatches = (textWithoutComments.match(pythonWhileRegex) || []).length;

    const loopMatches =
      forMatches +
      standaloneWhileMatches +
      doWhileMatches +
      forEachMatches +
      pythonForMatches +
      pythonWhileMatches;

    return {
      label: 'Cantidad de bucles',
      value: loopMatches,
    };
  },
};