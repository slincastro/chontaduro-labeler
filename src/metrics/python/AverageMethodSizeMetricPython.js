"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AverageMethodSizeMetricPython = void 0;
/**
 * Metric that calculates the average method size in Python code.
 */
exports.AverageMethodSizeMetricPython = {
    name: 'averageMethodSizePython',
    description: 'el número promedio de líneas por método en código Python.',
    extract: function (document) {
        var text = document.getText();
        var lines = text.split('\n');
        var methodSizes = [];
        var methodBlocks = [];
        var state = {
            insideMethod: false,
            methodIndent: 0,
            currentSize: 0,
            decoratorsCount: 0,
            insideMultilineString: false,
            multilineStringDelimiter: '',
            methodStack: [],
            currentMethodStartLine: 0,
            currentMethodName: '',
            insideMethodSignature: false,
            methodSignatureIndent: 0,
            methodSignatureStartLine: 0,
        };
        function processMultilineString(trimmed) {
            if (state.insideMultilineString) {
                if (state.insideMethod)
                    state.currentSize++;
                if (trimmed.includes(state.multilineStringDelimiter)) {
                    state.insideMultilineString = false;
                }
                return true;
            }
            var tripleQuoteMatch = trimmed.match(/^("""|''')/);
            if (tripleQuoteMatch) {
                var delim = tripleQuoteMatch[1];
                if (!trimmed.slice(3).includes(delim)) {
                    state.insideMultilineString = true;
                    state.multilineStringDelimiter = delim;
                }
                if (state.insideMethod)
                    state.currentSize++;
                return true;
            }
            return false;
        }
        function popMethodsFromStack(currentIndent, currentLine) {
            while (state.methodStack.length > 0 &&
                state.methodStack[state.methodStack.length - 1].indent >= currentIndent) {
                var popped = state.methodStack.pop();
                methodSizes.push(popped.size);
                methodBlocks.push({
                    startLine: popped.startLine,
                    endLine: currentLine - 1,
                    size: popped.size,
                    name: popped.name
                });
            }
        }
        function handleMethodDefinition(line, lineIndex) {
            var indent = line.search(/\S/);
            var methodNameMatch = line.match(/def\s+(\w+)/);
            var methodName = methodNameMatch ? methodNameMatch[1] : '';
            if (state.insideMethod && indent > state.methodIndent) {
                state.methodStack.push({
                    indent: state.methodIndent,
                    size: state.currentSize,
                    startLine: state.currentMethodStartLine,
                    name: state.currentMethodName
                });
            }
            else if (state.insideMethod) {
                methodSizes.push(state.currentSize);
                methodBlocks.push({
                    startLine: state.currentMethodStartLine,
                    endLine: lineIndex - 1,
                    size: state.currentSize,
                    name: state.currentMethodName
                });
                popMethodsFromStack(indent, lineIndex);
            }
            state.insideMethod = true;
            state.methodIndent = indent;
            state.currentSize = 1 + state.decoratorsCount;
            state.decoratorsCount = 0;
            state.currentMethodStartLine = lineIndex;
            state.currentMethodName = methodName;
        }
        function handleMethodContent(line, lineIndex) {
            var trimmed = line.trim();
            var indent = line.search(/\S/);
            if (indent !== -1 && indent <= state.methodIndent && trimmed !== '') {
                methodSizes.push(state.currentSize);
                methodBlocks.push({
                    startLine: state.currentMethodStartLine,
                    endLine: lineIndex - 1,
                    size: state.currentSize,
                    name: state.currentMethodName
                });
                state.insideMethod = false;
                popMethodsFromStack(indent, lineIndex);
                state.decoratorsCount = 0;
            }
            else {
                state.currentSize++;
            }
        }
        function finalize(lastLineIndex) {
            if (state.insideMethod) {
                methodSizes.push(state.currentSize);
                methodBlocks.push({
                    startLine: state.currentMethodStartLine,
                    endLine: lastLineIndex,
                    size: state.currentSize,
                    name: state.currentMethodName
                });
                state.insideMethod = false;
            }
            while (state.methodStack.length > 0) {
                var popped = state.methodStack.pop();
                methodSizes.push(popped.size);
                methodBlocks.push({
                    startLine: popped.startLine,
                    endLine: lastLineIndex,
                    size: popped.size,
                    name: popped.name
                });
            }
        }
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var trimmed = line.trim();
            if (trimmed === '' && !state.insideMethod)
                continue;
            if (processMultilineString(trimmed))
                continue;
            if (trimmed.startsWith('#') && !state.insideMethod)
                continue;
            if (trimmed.startsWith('@')) {
                state.decoratorsCount++;
                continue;
            }
            // Check if we're inside a method signature that spans multiple lines
            if (state.insideMethodSignature) {
                state.currentSize++;
                // Check if the signature ends on this line (has a colon at the end)
                if (trimmed.endsWith(':')) {
                    state.insideMethodSignature = false;
                    state.insideMethod = true;
                }
                continue;
            }
            var isMethodDef = /^\s*(async\s+)?def\s+\w+/.test(trimmed);
            if (isMethodDef) {
                // Check if the method definition ends on this line
                if (trimmed.endsWith(':')) {
                    handleMethodDefinition(line, i);
                }
                else {
                    // This is a multi-line method signature
                    state.insideMethodSignature = true;
                    state.methodSignatureIndent = line.search(/\S/);
                    state.methodSignatureStartLine = i;
                    // Start counting from this line
                    if (state.insideMethod) {
                        methodSizes.push(state.currentSize);
                        methodBlocks.push({
                            startLine: state.currentMethodStartLine,
                            endLine: i - 1,
                            size: state.currentSize,
                            name: state.currentMethodName
                        });
                        popMethodsFromStack(state.methodSignatureIndent, i);
                    }
                    var methodNameMatch = line.match(/def\s+(\w+)/);
                    var methodName = methodNameMatch ? methodNameMatch[1] : '';
                    state.insideMethod = false;
                    state.currentSize = 1 + state.decoratorsCount; // Count the first line of signature
                    state.decoratorsCount = 0;
                    state.currentMethodStartLine = i;
                    state.currentMethodName = methodName;
                }
            }
            else if (state.insideMethod) {
                handleMethodContent(line, i);
            }
        }
        finalize(lines.length - 1);
        var average = methodSizes.length === 0
            ? 0
            : Math.round(methodSizes.reduce(function (a, b) { return a + b; }, 0) / methodSizes.length);
        return {
            label: 'Tamaño promedio de métodos (Python)',
            value: average,
            methodBlocks: methodBlocks
        };
    },
};
