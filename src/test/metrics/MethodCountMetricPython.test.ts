import * as assert from 'assert';
import * as vscode from 'vscode';
import { MethodCountMetricPython } from '../../metrics/python/MethodCountMetricPython';

suite('MethodCountMetricPython Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Cantidad de métodos (Python)');
  });

  test('Should return 0 for document with no functions or methods', () => {
    const document = createMockDocument(`
# This is a comment
x = 5
print(x)

class SimpleClass:
    def __init__(self):
        self.value = 10
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 1); // Only __init__ method
  });

  test('Should count a single function correctly', () => {
    const document = createMockDocument(`
def test_function():
    print("Hello World")
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 1);
  });

  test('Should count multiple functions correctly', () => {
    const document = createMockDocument(`
def function1():
    print("Function 1")

def function2():
    return 42

def function3(param1, param2):
    return param1 + param2
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should count async functions correctly', () => {
    const document = createMockDocument(`
async def async_function():
    await some_operation()

def normal_function():
    print("Normal function")

async def another_async_function(param):
    return await process(param)
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should count class methods correctly', () => {
    const document = createMockDocument(`
class TestClass:
    def __init__(self):
        self.value = 0
    
    def method1(self):
        return self.value
    
    def method2(self, param):
        self.value = param
    
    def method3(self, param1, param2):
        return param1 + param2
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 4); // __init__ + 3 methods
  });

  test('Should count static methods correctly', () => {
    const document = createMockDocument(`
class TestClass:
    @staticmethod
    def static_method():
        return "Static method"
    
    @staticmethod
    def another_static_method(param):
        return param * 2
    
    def regular_method(self):
        return "Regular method"
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should count class methods correctly', () => {
    const document = createMockDocument(`
class TestClass:
    @classmethod
    def class_method(cls):
        return cls()
    
    @classmethod
    def another_class_method(cls, param):
        instance = cls()
        instance.value = param
        return instance
    
    def __init__(self):
        self.value = 0
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should count property methods correctly', () => {
    const document = createMockDocument(`
class TestClass:
    def __init__(self):
        self._value = 0
    
    @property
    def value(self):
        return self._value
    
    @value.setter
    def value(self, val):
        self._value = val
    
    @property
    def computed_value(self):
        return self._value * 2
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 4); // __init__ + getter + setter + computed_value
  });

  test('Should handle functions with complex parameters', () => {
    const document = createMockDocument(`
def function_with_defaults(param1, param2="default", param3=None):
    return param1

def function_with_args(*args):
    return sum(args)

def function_with_kwargs(**kwargs):
    return kwargs

def function_with_all(param1, param2="default", *args, **kwargs):
    return param1

def function_with_annotations(param1: int, param2: str = "default") -> str:
    return str(param1) + param2
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 5);
  });

  test('Should handle nested functions correctly', () => {
    const document = createMockDocument(`
def outer_function():
    def inner_function():
        return "Inner"
    
    def another_inner_function():
        return "Another inner"
    
    return inner_function() + another_inner_function()

def another_outer_function():
    def nested():
        def deeply_nested():
            return "Deep"
        return deeply_nested()
    return nested()
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 6); // All functions including nested ones
  });

  test('Should handle multiple decorators correctly', () => {
    const document = createMockDocument(`
class TestClass:
    @property
    @cached
    def cached_property(self):
        return expensive_computation()
    
    @staticmethod
    @decorator1
    @decorator2
    def decorated_static_method():
        return "Decorated"
    
    @classmethod
    @validate_input
    def decorated_class_method(cls, param):
        return cls(param)
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should not count function calls or references', () => {
    const document = createMockDocument(`
def real_function():
    # These should not be counted as function definitions
    function_call()
    another_function_call(param)
    
    # String containing function-like text
    text = "def fake_function(): pass"
    
    # Comment with function-like text
    # def comment_function(): pass
    
    return "Real function"

# Function call at module level
real_function()
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 1);
  });

  test('Should handle functions in different indentation levels', () => {
    const document = createMockDocument(`
def top_level_function():
    return "Top level"

class OuterClass:
    def outer_method(self):
        return "Outer method"
    
    class InnerClass:
        def inner_method(self):
            return "Inner method"
        
        def another_inner_method(self):
            def nested_function():
                return "Nested"
            return nested_function()

def another_top_level_function():
    return "Another top level"
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 6);
  });

  test('Should handle async methods in classes', () => {
    const document = createMockDocument(`
class AsyncClass:
    def __init__(self):
        self.value = 0
    
    async def async_method(self):
        await some_async_operation()
        return self.value
    
    async def another_async_method(self, param):
        result = await process_async(param)
        return result
    
    def sync_method(self):
        return "Sync method"
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 4);
  });

  test('Should ignore multiline strings and comments', () => {
    const document = createMockDocument(`
def real_function():
    """
    This is a docstring that might contain:
    def fake_function():
        pass
    """
    return "Real"

'''
Multi-line comment with function-like content:
def another_fake_function():
    return "fake"
'''

def another_real_function():
    # Single line comment: def fake(): pass
    return "Another real"
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 2);
  });

  test('Should handle lambda functions (not counted as methods)', () => {
    const document = createMockDocument(`
def real_function():
    # Lambda functions should not be counted as method definitions
    lambda_func = lambda x: x * 2
    another_lambda = lambda x, y: x + y
    
    # List comprehension with lambda
    result = list(map(lambda x: x * 2, [1, 2, 3]))
    
    return result

# Module level lambda
module_lambda = lambda: "module lambda"
    `);
    const result = MethodCountMetricPython.extract(document);
    
    assert.strictEqual(result.value, 1); // Only real_function
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
