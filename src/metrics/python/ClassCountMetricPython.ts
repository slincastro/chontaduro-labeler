import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

export const PythonClassCountMetricPython: Metric = {
  name: 'pythonClassCount',
  description: 'El número total de clases definidas en el archivo Python.',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    // Regex para detectar clases en Python
    // Captura líneas que comienzan con "class NombreClase:"
    const regex = /^\s*class\s+\w+\s*(\(.*\))?:/gm;
    const matches = text.match(regex);
    return {
      label: 'Clases (Python)',
      value: matches ? matches.length : 0,
    };
  },
};