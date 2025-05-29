import * as assert from 'assert';
import * as vscode from 'vscode';
import { CognitiveComplexityMetricPython } from '../../metrics/python/CognitiveComplexityMetricPython';

suite('CognitiveComplexityMetricPython Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = CognitiveComplexityMetricPython.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Complejidad Cognitiva estimada (Python)');
  });

  test('Should return low complexity for simple document', () => {
    const document = createMockDocument(`
# This is a comment
x = 5
print(x)

class SimpleClass:
    def __init__(self):
        self.value = 10
    
    def get_value(self):
        return self.value
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    assert.strictEqual(result.value, 5); // 2 function definitions + 1 return + actual complexity
  });

  test('Should count basic control structures correctly', () => {
    const document = createMockDocument(`
def test_control_structures():
    if x > 0:
        print("positive")
    
    for i in range(10):
        print(i)
    
    while y > 0:
        y -= 1
    
    try:
        risky_operation()
    except ValueError:
        print("error")
    finally:
        cleanup()
    
    with open("file.txt") as f:
        content = f.read()
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // def: +1, if: +1, for: +1, while: +1, try: +1, except: +1, finally: +1, with: +1
    assert.strictEqual(result.value, 15);
  });

  test('Should increase complexity for nested structures', () => {
    const document = createMockDocument(`
def test_nesting():
    if x > 0:
        if y > 0:
            if z > 0:
                print("all positive")
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // def: +1, first if: +1, second if: +1+1(nesting), third if: +1+2(nesting)
    assert.strictEqual(result.value, 10);
  });

  test('Should count logical operators correctly', () => {
    const document = createMockDocument(`
def test_logical_operators():
    if x > 0 and y > 0:
        print("both positive")
    
    if a > 0 or b > 0:
        print("at least one positive")
    
    if not c:
        print("c is falsy")
    
    if (x > 0 and y > 0) or (a < 0 and b < 0):
        print("complex condition")
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // def: +1, 4 ifs: +4, logical operators: and(2) + or(2) + not(1) + and(2) = +7
    assert.strictEqual(result.value, 17);
  });

  test('Should count jump statements correctly', () => {
    const document = createMockDocument(`
def test_jumps():
    if x < 0:
        return -1
    
    for i in range(10):
        if i == 5:
            break
        
        if i % 2 == 0:
            continue
        
        try:
            risky_operation()
        except Exception:
            raise ValueError("failed")
    
    return 0
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // def: +1, if: +1, for: +1, nested if: +1+1, nested if: +1+1, try: +1+1, except: +1+1
    // jumps: return(1) + break(1) + continue(1) + raise(1) + return(1) = +5
    assert.strictEqual(result.value, 27);
  });

  test('Should count lambdas correctly', () => {
    const document = createMockDocument(`
def test_lambdas():
    simple = lambda x: x * 2
    
    nested_lambda = lambda x: lambda y: x + y
    
    if condition:
        complex_lambda = lambda a, b: a if a > b else b
    
    data = [1, 2, 3]
    result = list(map(lambda x: x * 2, data))
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // def: +1, if: +1, lambdas: 2*1 + 2*1 + 2*2(nested) + 2*1 = +10
    assert.strictEqual(result.value, 16);
  });

  test('Should count comprehensions correctly', () => {
    const document = createMockDocument(`
def test_comprehensions():
    # List comprehension
    squares = [x**2 for x in range(10)]
    
    # Set comprehension
    unique_squares = {x**2 for x in range(10)}
    
    # Dict comprehension
    square_dict = {x: x**2 for x in range(10)}
    
    # Generator expression
    square_gen = (x**2 for x in range(10))
    
    # Nested comprehension
    if condition:
        nested = [x for x in [y for y in range(10)]]
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // def: +1, if: +1, comprehensions: 2*1 + 2*1 + 2*1 + 2*1 + 2*2(nested) = +12
    assert.strictEqual(result.value, 30);
  });

  test('Should handle async/await correctly', () => {
    const document = createMockDocument(`
async def test_async():
    result = await some_async_operation()
    
    async with async_context_manager() as cm:
        data = await cm.get_data()
    
    async for item in async_iterator():
        await process_item(item)
    
    return result
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // async def: +1, async with: +1, async for: +1, await(3): +3, return: +1
    assert.strictEqual(result.value, 10);
  });

  test('Should ignore comments and docstrings', () => {
    const document = createMockDocument(`
def test_comments_and_strings():
    """
    This is a docstring that might contain:
    if condition:
        for item in items:
            while True:
                break
    """
    
    # This is a comment with if x > 0 and y > 0:
    string_with_code = "if x > 0: return True"
    
    '''
    Another multiline string with:
    lambda x: x * 2
    [x for x in range(10)]
    '''
    
    # This is a real if statement
    if z == 0:
        print("z is zero")
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // def: +1, if: +1
    assert.strictEqual(result.value, 3);
  });

  test('Should handle yield statements correctly', () => {
    const document = createMockDocument(`
def test_generators():
    for i in range(10):
        if i % 2 == 0:
            yield i
        else:
            yield from other_generator()
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // def: +1, for: +1, if: +1+1(nesting), else: +1+1(nesting), yield: +1, yield from: +1
    assert.strictEqual(result.value, 13);
  });

  test('Should handle complex nested structures', () => {
    const document = createMockDocument(`
def complex_function(data):
    if not data:
        raise ValueError("No data provided")
    
    results = []
    
    for item in data:
        if item.get("type") == "user":
            try:
                if item.get("active", False):
                    user_data = process_user(item)
                    if user_data and user_data.get("valid"):
                        results.append(user_data)
                    else:
                        continue
                else:
                    inactive_users.append(item)
            except Exception as e:
                if should_retry(e):
                    retry_queue.append(item)
                else:
                    error_log.append({"item": item, "error": str(e)})
        elif item.get("type") == "product":
            product_data = [p for p in item.get("products", []) if p.get("available")]
            if product_data:
                results.extend(product_data)
    
    return results if results else None
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // This is a complex example with deep nesting and multiple control structures
    assert.ok(result.value > 20, `Expected complexity to be high, got ${result.value}`);
  });

  test('Should handle class methods with different complexities', () => {
    const document = createMockDocument(`
class DataProcessor:
    def __init__(self, config):
        self.config = config
    
    def simple_method(self):
        return self.config.get("value", 0)
    
    def complex_method(self, data):
        if not data:
            return []
        
        results = []
        for item in data:
            if self.validate_item(item):
                processed = self.process_item(item)
                if processed:
                    results.append(processed)
        
        return results
    
    @staticmethod
    def utility_method(value):
        return value * 2 if value > 0 else 0
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // Multiple method definitions with varying complexity
    assert.ok(result.value > 5, `Expected some complexity, got ${result.value}`);
  });

  test('Should handle list comprehensions with conditions', () => {
    const document = createMockDocument(`
def test_complex_comprehensions():
    # Simple comprehension
    squares = [x**2 for x in range(10)]
    
    # Comprehension with condition
    even_squares = [x**2 for x in range(10) if x % 2 == 0]
    
    # Nested comprehension
    matrix = [[i*j for j in range(3)] for i in range(3)]
    
    # Complex comprehension with multiple conditions
    filtered_data = [
        item.value for item in data_list 
        if item.is_valid and item.value > threshold
    ]
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // def: +1, comprehensions with varying complexity
    assert.ok(result.value > 5, `Expected complexity from comprehensions, got ${result.value}`);
  });

  test('Should handle exception handling correctly', () => {
    const document = createMockDocument(`
def test_exception_handling():
    try:
        risky_operation()
    except ValueError as e:
        if e.args:
            log_error(e)
        return None
    except (TypeError, AttributeError):
        return default_value()
    except Exception:
        raise
    finally:
        cleanup()
    
    return success_value()
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // def: +1, try: +1, except: +1, if: +1+1(nesting), except: +1, except: +1, finally: +1
    // returns/raise: +3
    assert.strictEqual(result.value, 22);
  });

  test('Should handle context managers correctly', () => {
    const document = createMockDocument(`
def test_context_managers():
    with open("file1.txt") as f1:
        with open("file2.txt") as f2:
            if f1.readable() and f2.readable():
                data = f1.read() + f2.read()
                return data
    
    async with async_resource() as resource:
        result = await resource.process()
        return result
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // def: +1, with: +1, nested with: +1+1, if: +1+2, async with: +1, await: +1, returns: +2
    assert.strictEqual(result.value, 19);
  });

  test('Should handle real-world Python example', () => {
    const document = createMockDocument(`
import asyncio
from typing import List, Optional

class AsyncDataProcessor:
    def __init__(self, max_workers: int = 5):
        self.max_workers = max_workers
        self.semaphore = asyncio.Semaphore(max_workers)
    
    async def process_batch(self, items: List[dict]) -> List[dict]:
        if not items:
            return []
        
        tasks = []
        for item in items:
            if self.should_process(item):
                task = asyncio.create_task(self.process_item(item))
                tasks.append(task)
        
        if not tasks:
            return []
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            processed_results = []
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    if self.should_retry(result):
                        retry_result = await self.retry_item(items[i])
                        if retry_result:
                            processed_results.append(retry_result)
                    else:
                        self.log_error(items[i], result)
                else:
                    processed_results.append(result)
            
            return processed_results
        except Exception as e:
            self.log_error({"batch": len(items)}, e)
            raise
    
    async def process_item(self, item: dict) -> Optional[dict]:
        async with self.semaphore:
            try:
                if item.get("type") == "complex":
                    return await self.process_complex_item(item)
                elif item.get("type") == "simple":
                    return self.process_simple_item(item)
                else:
                    return None
            except Exception as e:
                if self.is_recoverable_error(e):
                    return await self.handle_recoverable_error(item, e)
                else:
                    raise
    
    def should_process(self, item: dict) -> bool:
        return (
            item.get("enabled", True) and 
            item.get("status") != "processed" and
            item.get("priority", 0) > 0
        )
    
    async def retry_item(self, item: dict) -> Optional[dict]:
        retries = item.get("retries", 0)
        if retries < 3:
            item["retries"] = retries + 1
            return await self.process_item(item)
        else:
            return None
    `);
    const result = CognitiveComplexityMetricPython.extract(document);
    
    // This is a complex real-world example with many control structures and nesting
    assert.ok(result.value > 30, `Expected high complexity for real-world example, got ${result.value}`);
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
