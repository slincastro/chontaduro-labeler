import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';

/**
 * Metric that calculates the average method size in Python code.
 */
export const AverageMethodSizeMetricPython: Metric = {
  name: 'averageMethodSizePython',
  description: 'el número promedio de líneas por método en código Python.',
  
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const lines = text.split('\n');
    const methodSizes: number[] = [];

    interface PythonMethod {
      indent: number;
      size: number;
    }

    const state = {
      insideMethod: false,
      methodIndent: 0,
      currentSize: 0,
      decoratorsCount: 0,
      insideMultilineString: false,
      multilineStringDelimiter: '',
      methodStack: [] as PythonMethod[],
    };

    function processMultilineString(trimmed: string): boolean {
      if (state.insideMultilineString) {
        if (state.insideMethod) state.currentSize++;
        if (trimmed.includes(state.multilineStringDelimiter)) {
          state.insideMultilineString = false;
        }
        return true;
      }

      const tripleQuoteMatch = trimmed.match(/^("""|''')/);
      if (tripleQuoteMatch) {
        const delim = tripleQuoteMatch[1];
        if (!trimmed.slice(3).includes(delim)) {
          state.insideMultilineString = true;
          state.multilineStringDelimiter = delim;
        }
        if (state.insideMethod) state.currentSize++;
        return true;
      }

      return false;
    }

    function popMethodsFromStack(currentIndent: number): void {
      while (
        state.methodStack.length > 0 &&
        state.methodStack[state.methodStack.length - 1].indent >= currentIndent
      ) {
        const popped = state.methodStack.pop()!;
        methodSizes.push(popped.size);
      }
    }

    function handleMethodDefinition(line: string): void {
      const indent = line.search(/\S/);

      if (state.insideMethod && indent > state.methodIndent) {
        state.methodStack.push({
          indent: state.methodIndent,
          size: state.currentSize,
        });
      } else if (state.insideMethod) {
        methodSizes.push(state.currentSize);
        popMethodsFromStack(indent);
      }

      state.insideMethod = true;
      state.methodIndent = indent;
      state.currentSize = 1 + state.decoratorsCount;
      state.decoratorsCount = 0;
    }

    function handleMethodContent(line: string): void {
      const trimmed = line.trim();
      const indent = line.search(/\S/);

      if (indent !== -1 && indent <= state.methodIndent && trimmed !== '') {
        methodSizes.push(state.currentSize);
        state.insideMethod = false;
        popMethodsFromStack(indent);
        state.decoratorsCount = 0;
      } else {
        state.currentSize++;
      }
    }

    function finalize(): void {
      if (state.insideMethod) {
        methodSizes.push(state.currentSize);
        state.insideMethod = false;
      }

      while (state.methodStack.length > 0) {
        const popped = state.methodStack.pop()!;
        methodSizes.push(popped.size);
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed === '' && !state.insideMethod) continue;
      if (processMultilineString(trimmed)) continue;
      if (trimmed.startsWith('#') && !state.insideMethod) continue;
      if (trimmed.startsWith('@')) {
        state.decoratorsCount++;
        continue;
      }

      const isMethodDef = /^\s*(async\s+)?def\s+\w+/.test(trimmed);
      if (isMethodDef) {
        handleMethodDefinition(line);
      } else if (state.insideMethod) {
        handleMethodContent(line);
      }
    }

    finalize();

    const average =
      methodSizes.length === 0
        ? 0
        : Math.round(methodSizes.reduce((a, b) => a + b, 0) / methodSizes.length);

    return {
      label: 'Tamaño promedio de métodos (Python)',
      value: average,
    };
  },
};
