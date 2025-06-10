import * as assert from 'assert';
import * as vscode from 'vscode';
import { AverageMethodSizeMetric } from '../../metrics/common/AverageMethodSizeMetric';

suite('AverageMethodSizeMetric Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = AverageMethodSizeMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Tamaño promedio de métodos');
  });

  test('Should return 0 for document with no methods', () => {
    const document = createMockDocument(`
      // This is a comment
      const x = 5;
      console.log(x);
    `);
    const result = AverageMethodSizeMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should calculate average method size correctly for single method', () => {
    const document = createMockDocument(`
      public void TestMethod()
      {
        int x = 5;
        Console.WriteLine(x);
      }
    `);
    const result = AverageMethodSizeMetric.extract(document);
    
    assert.strictEqual(result.value, 5); // 1 line for signature, 1 for opening brace, 2 for content, 1 for closing brace
  });

  test('Should calculate average method size correctly for multiple methods', () => {
    const document = createMockDocument(`
      public void Method1()
      {
        int x = 5;
      }

      private int Method2()
      {
        int y = 10;
        return y;
      }

      protected static string Method3()
      {
        string z = "hello";
        Console.WriteLine(z);
        return z;
      }
    `);
    const result = AverageMethodSizeMetric.extract(document);
    
    // Method1: 4 lines (signature, opening brace, content, closing brace)
    // Method2: 5 lines (signature, opening brace, 2 lines content, closing brace)
    // Method3: 6 lines (signature, opening brace, 3 lines content, closing brace)
    // Average: (4 + 5 + 6) / 3 = 5
    assert.strictEqual(result.value, 5);
  });

  test('Should handle method signatures spanning multiple lines', () => {
    const document = createMockDocument(`
      public void LongSignatureMethod(int param1, string param2)
      {
        Console.WriteLine(param1 + param2);
      }
    `);
    const result = AverageMethodSizeMetric.extract(document);
    
    // 1 line for signature, 1 for opening brace, 1 for content, 1 for closing brace = 4 lines
    assert.strictEqual(result.value, 4);
  });

  test('Should handle nested braces correctly', () => {
    const document = createMockDocument(`
      public void NestedMethod()
      {
        if (true)
        {
          Console.WriteLine("Nested");
          if (false)
          {
            Console.WriteLine("Double nested");
          }
        }
      }
    `);
    const result = AverageMethodSizeMetric.extract(document);
    
    // 1 line for signature, 1 for opening brace, 8 lines for content with nested braces, 1 for closing brace = 11 lines
    assert.strictEqual(result.value, 11);
  });

  test('Should handle async methods', () => {
    const document = createMockDocument(`
      public async Task<int> AsyncMethod()
      {
        await Task.Delay(1000);
        return 42;
      }
    `);
    const result = AverageMethodSizeMetric.extract(document);
    
    // 1 line for signature, 1 for opening brace, 2 for content, 1 for closing brace = 5 lines
    assert.strictEqual(result.value, 5);
  });

  test('Should handle methods with comments', () => {
    const document = createMockDocument(`
      // This is a method with comments
      public void CommentedMethod()
      {
        // This is a comment inside the method
        int x = 10;
        // Another comment
        Console.WriteLine(x);
      }
    `);
    const result = AverageMethodSizeMetric.extract(document);
    
    // 1 line for signature, 1 for opening brace, 4 for content (including comments), 1 for closing brace = 7 lines
    assert.strictEqual(result.value, 7);
  });

  test('Should handle methods with different access modifiers', () => {
    const document = createMockDocument(`
      private void PrivateMethod()
      {
        int x = 5;
      }

      protected void ProtectedMethod()
      {
        int y = 10;
      }

      internal void InternalMethod()
      {
        int z = 15;
      }
    `);
    const result = AverageMethodSizeMetric.extract(document);
    
    // Each method is 4 lines (signature, opening brace, content, closing brace)
    // Average: (4 + 4 + 4) / 3 = 4
    assert.strictEqual(result.value, 4);
  });

  test('Should handle methods with generic types', () => {
    const document = createMockDocument(`
      public List<T> GenericMethod<T>(T item) where T : class
      {
        var list = new List<T>();
        list.Add(item);
        return list;
      }
    `);
    const result = AverageMethodSizeMetric.extract(document);
    
    // 1 line for signature, 1 for opening brace, 3 for content, 1 for closing brace = 6 lines
    assert.strictEqual(result.value, 6);
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
    fileName: 'test.cs',
    uri: vscode.Uri.file('test.cs'),
    version: 1,
    isDirty: false,
    isUntitled: false,
    isClosed: false,
    languageId: 'csharp',
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
