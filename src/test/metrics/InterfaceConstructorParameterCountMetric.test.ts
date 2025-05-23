import * as assert from 'assert';
import * as vscode from 'vscode';
import { InterfaceConstructorParameterCountMetric } from '../../metrics/InterfaceConstructorParameterCountMetric';

suite('InterfaceConstructorParameterCountMetric Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = InterfaceConstructorParameterCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should return 0 for document with no interfaces', () => {
    const document = createMockDocument(`
      public class TestClass
      {
        public void TestMethod() { }
      }
    `);
    const result = InterfaceConstructorParameterCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should return 0 for interface with no constructors', () => {
    const document = createMockDocument(`
      public interface ITestInterface
      {
        void TestMethod();
        int TestProperty { get; set; }
      }
    `);
    const result = InterfaceConstructorParameterCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should count parameters in a single interface constructor', () => {
    const document = createMockDocument(`
      public interface ITestInterface
      {
        ITestInterface(int param1, string param2);
        void TestMethod();
      }
    `);
    const result = InterfaceConstructorParameterCountMetric.extract(document);
    
    assert.strictEqual(result.value, 2);
  });

  test('Should count parameters in multiple interface constructors', () => {
    const document = createMockDocument(`
      public interface ITestInterface
      {
        ITestInterface();
        ITestInterface(int param1);
        ITestInterface(int param1, string param2, bool param3);
        void TestMethod();
      }
    `);
    const result = InterfaceConstructorParameterCountMetric.extract(document);
    
    assert.strictEqual(result.value, 4); // 0 + 1 + 3
  });

  test('Should count parameters in constructors across multiple interfaces', () => {
    const document = createMockDocument(`
      public interface IInterface1
      {
        IInterface1(int param1, string param2);
      }

      public interface IInterface2
      {
        IInterface2();
        IInterface2(int param1, string param2, bool param3);
      }
    `);
    const result = InterfaceConstructorParameterCountMetric.extract(document);
    
    assert.strictEqual(result.value, 5); // 2 + 0 + 3
  });

  test('Should ignore constructors in classes', () => {
    const document = createMockDocument(`
      public interface ITestInterface
      {
        ITestInterface(int param1, string param2);
      }

      public class TestClass
      {
        public TestClass(int param1, string param2, bool param3) { }
      }
    `);
    const result = InterfaceConstructorParameterCountMetric.extract(document);
    
    assert.strictEqual(result.value, 2); // Only counts interface constructor parameters
  });

  test('Should handle interface with empty constructor', () => {
    const document = createMockDocument(`
      public interface ITestInterface
      {
        ITestInterface();
        void TestMethod();
      }
    `);
    const result = InterfaceConstructorParameterCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should handle complex parameter types', () => {
    const document = createMockDocument(`
      public interface ITestInterface
      {
        ITestInterface(List<string> param1, Dictionary<int, object> param2);
      }
    `);
    const result = InterfaceConstructorParameterCountMetric.extract(document);
    
    assert.strictEqual(result.value, 2);
  });

  test('Should handle interfaces with both constructors and methods', () => {
    const document = createMockDocument(`
      public interface ITestInterface
      {
        ITestInterface(int param1);
        void TestMethod1();
        void TestMethod2(string param);
      }
    `);
    const result = InterfaceConstructorParameterCountMetric.extract(document);
    
    assert.strictEqual(result.value, 1); // Only counts constructor parameters
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
