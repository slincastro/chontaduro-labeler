import * as assert from 'assert';
import * as vscode from 'vscode';
import { LambdaCountMetricPython } from '../../metrics/python/LambdaCountMetricPython';

suite('LambdaCountMetricPython Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = LambdaCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Lambdas (Python)');
  });

  test('Should return 0 for document with no lambda expressions', () => {
    const document = createMockDocument(`
      # This is a comment
      x = 5
      print(x)
      
      def test_function():
          return True
      
      class SimpleClass:
          def __init__(self):
              self.value = 10
          
          def normal_method(self):
              return self.value
    `);
    const result = LambdaCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should count a single lambda expression correctly', () => {
    const document = createMockDocument(`
      add = lambda a, b: a + b
    `);
    const result = LambdaCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 1);
  });

  test('Should count multiple lambda expressions correctly', () => {
    const document = createMockDocument(`
      add = lambda a, b: a + b
      subtract = lambda a, b: a - b
      multiply = lambda a, b: a * b
      divide = lambda a, b: a / b
    `);
    const result = LambdaCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 4);
  });

  test('Should count lambda expressions in different contexts', () => {
    const document = createMockDocument(`
      # Top-level lambda
      top_level = lambda: print('Top level')
      
      def test_function():
          # Lambda inside a function
          inner_lambda = lambda: print('Inner lambda')
          
          # Lambda as an argument
          numbers = [1, 2, 3, 4, 5]
          doubled = list(map(lambda x: x * 2, numbers))
          
          return lambda: 'Return lambda'
      
      class TestClass:
          def __init__(self):
              # Lambda in constructor
              self.handler = lambda: print('Constructor lambda')
          
          def test_method(self):
              # Lambda in a method
              method_lambda = lambda: print('Method lambda')
              
              # Lambda in a list
              lambda_list = [
                  lambda: 1,
                  lambda: 2,
                  lambda: 3
              ]
    `);
    const result = LambdaCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 9);
  });

  test('Should not count lambda expressions in comments or strings', () => {
    const document = createMockDocument(`
      # This is a comment with a lambda: lambda x: x * 2
      s = "This is a string with a lambda: lambda x: x * 2"
      print("add = lambda a, b: a + b")
      '''
      Multi-line string with
      multiply = lambda a, b: a * b
      '''
      
      # This is a real lambda expression
      real_lambda = lambda: print('This is a real lambda')
    `);
    const result = LambdaCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 1);
  });

  test('Should handle lambda expressions with different parameter patterns', () => {
    const document = createMockDocument(`
      # No parameters
      no_params = lambda: 'No params'
      
      # Single parameter
      single_param = lambda x: x * x
      
      # Multiple parameters
      multiple_params = lambda a, b, c: a + b + c
      
      # Default parameters
      default_params = lambda x=0, y=0: x + y
      
      # *args and **kwargs
      args_kwargs = lambda *args, **kwargs: sum(args) + sum(kwargs.values())
    `);
    const result = LambdaCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 5);
  });

  test('Should handle lambda expressions in complex scenarios', () => {
    const document = createMockDocument(`
      # Lambda in list comprehension
      numbers = [1, 2, 3, 4, 5]
      squared = [(lambda x: x * x)(n) for n in numbers]
      
      # Lambda in sorting
      people = [('Alice', 25), ('Bob', 30), ('Charlie', 20)]
      sorted_people = sorted(people, key=lambda person: person[1])
      
      # Lambda in filter
      even_numbers = list(filter(lambda x: x % 2 == 0, numbers))
      
      # Lambda in reduce
      from functools import reduce
      sum_numbers = reduce(lambda acc, n: acc + n, numbers, 0)
      
      # Lambda in dictionary
      operations = {
          'add': lambda a, b: a + b,
          'subtract': lambda a, b: a - b,
          'multiply': lambda a, b: a * b,
          'divide': lambda a, b: a / b
      }
    `);
    const result = LambdaCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 7);
  });

  test('Should handle multiline strings correctly', () => {
    const document = createMockDocument(`
      # Triple single quotes
      '''
      This is a multiline string with lambda x: x
      '''
      
      # Triple double quotes
      """
      This is another multiline string with lambda x: x
      """
      
      # Real lambda after multiline string
      real_lambda = lambda x: x * 2
    `);
    const result = LambdaCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 1);
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
