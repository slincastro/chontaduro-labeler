import * as fs from 'fs';
import * as path from 'path';
import { AverageMethodSizeMetricPython } from './src/metrics/python/AverageMethodSizeMetricPython';

// Import vscode types
import * as vscode from 'vscode';

// Mock the vscode.TextDocument interface
const mockTextDocument = {
    getText: () => fs.readFileSync(path.join(__dirname, 'test_multiline_signature.py'), 'utf8'),
    lineAt: (lineOrPosition: number | vscode.Position) => {
        const content = fs.readFileSync(path.join(__dirname, 'test_multiline_signature.py'), 'utf8');
        const lines = content.split('\n');
        const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
        return {
            text: lines[line] || '',
            lineNumber: line,
            range: new vscode.Range(line, 0, line, (lines[line] || '').length),
            rangeIncludingLineBreak: new vscode.Range(line, 0, line, (lines[line] || '').length + 1),
            firstNonWhitespaceCharacterIndex: (lines[line] || '').search(/\S/),
            isEmptyOrWhitespace: !((lines[line] || '').trim().length > 0)
        };
    },
    lineCount: fs.readFileSync(path.join(__dirname, 'test_multiline_signature.py'), 'utf8').split('\n').length,
    fileName: 'test_multiline_signature.py',
    uri: vscode.Uri.file('test_multiline_signature.py'),
    version: 1,
    isDirty: false,
    isUntitled: false,
    isClosed: false,
    languageId: 'python',
    eol: vscode.EndOfLine.LF,
    encoding: 'utf8',
    save: () => Promise.resolve(true),
    getWordRangeAtPosition: () => undefined,
    offsetAt: () => 0,
    positionAt: () => new vscode.Position(0, 0),
    validateRange: () => new vscode.Range(0, 0, 0, 0),
    validatePosition: () => new vscode.Position(0, 0),
} as vscode.TextDocument;

// Extract metrics
const result = AverageMethodSizeMetricPython.extract(mockTextDocument);

// Print the results
console.log('Average Method Size:', result.value);
console.log('Method Blocks:', JSON.stringify(result.methodBlocks, null, 2));
