import * as assert from 'assert';
import * as vscode from 'vscode';
import { NestingDepthMetricPython } from '../../metrics/python/NestingDepthMetricPython';

suite('NestingDepthMetricPython Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = NestingDepthMetricPython.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Profundidad real (Python)');
  });

  test('Should return 0 for document with no nesting', () => {
    const document = createMockDocument(`
# This is a comment
x = 5
print(x)
    `);
    const result = NestingDepthMetricPython.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should calculate simple function nesting depth correctly', () => {
    const document = createMockDocument(`
def test_function():
    if True:
        print('Condition is true')
    `);
    const result = NestingDepthMetricPython.extract(document);
    
    assert.strictEqual(result.value, 2); // Function (1) + if (1) = 2
  });

  test('Should calculate complex nesting depth correctly', () => {
    const document = createMockDocument(`
def test_function():
    if x > 0:
        for i in range(x):
            if i % 2 == 0:
                while some_condition:
                    do_something()
    `);
    const result = NestingDepthMetricPython.extract(document);
    
    assert.strictEqual(result.value, 5); // Function(1) + if(1) + for(1) + if(1) + while(1) = 5
  });

  test('Should handle class definitions with methods', () => {
    const document = createMockDocument(`
class TestClass:
    def __init__(self):
        self.value = 10
        
    def test_method(self):
        if self.value > 0:
            for i in range(self.value):
                print(i)
    `);
    const result = NestingDepthMetricPython.extract(document);
    
    assert.strictEqual(result.value, 4); // Class(1) + method(1) + if(1) + for(1) = 4
  });

  test('Should ignore comments and empty lines', () => {
    const document = createMockDocument(`
def test_function():
    # This is a comment
    if True:
        # Another comment
        
        print('Hello')
        # More comments
    `);
    const result = NestingDepthMetricPython.extract(document);
    
    assert.strictEqual(result.value, 2); // Function(1) + if(1) = 2
  });

  test('Should handle multiline strings correctly', () => {
    const document = createMockDocument(`
def test_function():
    """
    This is a multiline string
    with some content that might look like code:
    if True:
        for i in range(10):
            print(i)
    """
    if True:
        print('Real code')
    `);
    const result = NestingDepthMetricPython.extract(document);
    
    assert.strictEqual(result.value, 2); // Function(1) + if(1) = 2
  });

  test('Should handle mixed indentation correctly', () => {
    const document = createMockDocument(`
def outer_function():
    if condition1:
        print('Level 2')
    
    if condition2:
        for item in items:
            if item.valid:
                process(item)
    `);
    const result = NestingDepthMetricPython.extract(document);
    
    assert.strictEqual(result.value, 4); // Function(1) + if(1) + for(1) + if(1) = 4
  });

  test('Should handle try-except blocks', () => {
    const document = createMockDocument(`
def test_function():
    try:
        if risky_operation():
            for item in items:
                process(item)
    except Exception:
        if error_handling:
            log_error()
    `);
    const result = NestingDepthMetricPython.extract(document);
    
    assert.strictEqual(result.value, 4); // Function(1) + try(1) + if(1) + for(1) = 4
  });

  test('Should handle with statements', () => {
    const document = createMockDocument(`
def test_function():
    with open('file.txt') as f:
        for line in f:
            if line.strip():
                process_line(line)
    `);
    const result = NestingDepthMetricPython.extract(document);
    
    assert.strictEqual(result.value, 4); // Function(1) + with(1) + for(1) + if(1) = 4
  });

  test('Should handle lambda functions and comprehensions', () => {
    const document = createMockDocument(`
def test_function():
    if condition:
        result = [x for x in items if x.valid]
        filtered = filter(lambda x: x > 0, numbers)
    `);
    const result = NestingDepthMetricPython.extract(document);
    
    assert.strictEqual(result.value, 2); // Function(1) + if(1) = 2
    // Note: List comprehensions and lambdas don't add to nesting depth in this implementation
  });
});

function createMockDocument(content: string): vscode.TextDocument {
  return {
    getText: () => content,
    lineAt: (lineOrPosition: number | vscode.Position) => {
      const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
      return {
        text: content.split('\n')[line] || '',
        lineNumber: line,
        range: new vscode.Range(line, 0, line, (content.split('\n')[line] || '').length),
        rangeIncludingLineBreak: new vscode.Range(line, 0, line, (content.split('\n')[line] || '').length + 1),
        firstNonWhitespaceCharacterIndex: (content.split('\n')[line] || '').search(/\S/),
        isEmptyOrWhitespace: !((content.split('\n')[line] || '').trim().length > 0)
      };
    },
    lineCount: content.split('\n').length,
    fileName: 'test.py',
    uri: vscode.Uri.file('test.py'),
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
}
