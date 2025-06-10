const fs = require('fs');
const path = require('path');

// Read the Python file
const pythonFilePath = path.join(__dirname, 'test_multiline_signature.py');
const pythonFileContent = fs.readFileSync(pythonFilePath, 'utf8');
const lines = pythonFileContent.split('\n');

// Simplified version of the AverageMethodSizeMetricPython logic
function countMethodLines() {
  const methodSizes = [];
  const methodBlocks = [];

  const state = {
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

  function popMethodsFromStack(currentIndent, currentLine) {
    while (
      state.methodStack.length > 0 &&
      state.methodStack[state.methodStack.length - 1].indent >= currentIndent
    ) {
      const popped = state.methodStack.pop();
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
    const indent = line.search(/\S/);
    const methodNameMatch = line.match(/def\s+(\w+)/);
    const methodName = methodNameMatch ? methodNameMatch[1] : '';

    if (state.insideMethod && indent > state.methodIndent) {
      state.methodStack.push({
        indent: state.methodIndent,
        size: state.currentSize,
        startLine: state.currentMethodStartLine,
        name: state.currentMethodName
      });
    } else if (state.insideMethod) {
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
    const trimmed = line.trim();
    const indent = line.search(/\S/);

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
    } else {
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
      const popped = state.methodStack.pop();
      methodSizes.push(popped.size);
      methodBlocks.push({
        startLine: popped.startLine,
        endLine: lastLineIndex,
        size: popped.size,
        name: popped.name
      });
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

    const isMethodDef = /^\s*(async\s+)?def\s+\w+/.test(trimmed);
    if (isMethodDef) {
      // Check if the method definition ends on this line
      if (trimmed.endsWith(':')) {
        handleMethodDefinition(line, i);
      } else {
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
        
        const methodNameMatch = line.match(/def\s+(\w+)/);
        const methodName = methodNameMatch ? methodNameMatch[1] : '';
        
        state.insideMethod = false;
        state.currentSize = 1 + state.decoratorsCount; // Count the first line of signature
        state.decoratorsCount = 0;
        state.currentMethodStartLine = i;
        state.currentMethodName = methodName;
      }
    } else if (state.insideMethod) {
      handleMethodContent(line, i);
    }
  }

  finalize(lines.length - 1);

  const average =
    methodSizes.length === 0
      ? 0
      : Math.round(methodSizes.reduce((a, b) => a + b, 0) / methodSizes.length);

  return {
    average,
    methodSizes,
    methodBlocks
  };
}

// Run the analysis
const result = countMethodLines();

// Print the results
console.log('Method Sizes:', result.methodSizes);
console.log('Average Method Size:', result.average);
console.log('Method Blocks:');
result.methodBlocks.forEach(block => {
  console.log(`  ${block.name || 'anonymous'}: lines ${block.startLine + 1}-${block.endLine + 1}, size: ${block.size}`);
});
