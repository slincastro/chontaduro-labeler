"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var AverageMethodSizeMetricPython_1 = require("./src/metrics/python/AverageMethodSizeMetricPython");
// Import vscode types
var vscode = require("vscode");
// Mock the vscode.TextDocument interface
var mockTextDocument = {
    getText: function () { return fs.readFileSync(path.join(__dirname, 'test_multiline_signature.py'), 'utf8'); },
    lineAt: function (lineOrPosition) {
        var content = fs.readFileSync(path.join(__dirname, 'test_multiline_signature.py'), 'utf8');
        var lines = content.split('\n');
        var line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
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
    save: function () { return Promise.resolve(true); },
    getWordRangeAtPosition: function () { return undefined; },
    offsetAt: function () { return 0; },
    positionAt: function () { return new vscode.Position(0, 0); },
    validateRange: function () { return new vscode.Range(0, 0, 0, 0); },
    validatePosition: function () { return new vscode.Position(0, 0); },
};
// Extract metrics
var result = AverageMethodSizeMetricPython_1.AverageMethodSizeMetricPython.extract(mockTextDocument);
// Print the results
console.log('Average Method Size:', result.value);
console.log('Method Blocks:', JSON.stringify(result.methodBlocks, null, 2));
