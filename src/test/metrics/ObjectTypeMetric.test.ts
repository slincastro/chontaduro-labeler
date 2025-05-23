import * as assert from 'assert';
import * as vscode from 'vscode';
import { ObjectTypeMetric } from '../../metrics/ObjectTypeMetric';

suite('ObjectTypeMetric Test Suite', () => {
  // Type code mapping for reference:
  // class: 1, interface: 2, enum: 3, struct: 4, record: 5, namespace: 6, delegate: 7

  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Tipo de Objeto');
  });

  test('Should return 0 for document with no object types', () => {
    const document = createMockDocument(`
      // This is a comment
      const x = 5;
      console.log(x);
    `);
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should detect class and return correct type code', () => {
    const document = createMockDocument(`
      public class TestClass
      {
        private int _field;
        
        public void TestMethod()
        {
          Console.WriteLine("Test");
        }
      }
    `);
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 1); // 1 is the code for class
    assert.strictEqual(result.label, 'Class');
  });

  test('Should detect interface and return correct type code', () => {
    const document = createMockDocument(`
      public interface ITestInterface
      {
        void TestMethod();
        int TestProperty { get; set; }
      }
    `);
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 2); // 2 is the code for interface
    assert.strictEqual(result.label, 'Interface');
  });

  test('Should detect enum and return correct type code', () => {
    const document = createMockDocument(`
      public enum TestEnum
      {
        Value1,
        Value2,
        Value3
      }
    `);
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 3); // 3 is the code for enum
    assert.strictEqual(result.label, 'Enum');
  });

  test('Should detect struct and return correct type code', () => {
    const document = createMockDocument(`
      public struct TestStruct
      {
        public int X;
        public int Y;
        
        public TestStruct(int x, int y)
        {
          X = x;
          Y = y;
        }
      }
    `);
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 4); // 4 is the code for struct
    assert.strictEqual(result.label, 'Struct');
  });

  test('Should detect record and return correct type code', () => {
    const document = createMockDocument(`
      public record TestRecord(string Name, int Age);
    `);
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 5); // 5 is the code for record
    assert.strictEqual(result.label, 'Record');
  });

  test('Should detect namespace and return correct type code', () => {
    const document = createMockDocument(`
      namespace TestNamespace
      {
      }
    `);
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 6); // 6 is the code for namespace
    assert.strictEqual(result.label, 'Namespace');
  });

  test('Should detect delegate and return correct type code', () => {
    const document = createMockDocument(`
      public delegate void TestDelegate(string message);
    `);
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 7); // 7 is the code for delegate
    assert.strictEqual(result.label, 'Delegate');
  });

  test('Should return the dominant type when multiple types are present', () => {
    const document = createMockDocument(`
      namespace TestNamespace
      {
        public interface ITest
        {
          void Test();
        }
        
        public class Test1 : ITest
        {
          public void Test() {}
        }
        
        public class Test2 : ITest
        {
          public void Test() {}
        }
        
        public enum TestEnum
        {
          Value1,
          Value2
        }
      }
    `);
    const result = ObjectTypeMetric.extract(document);
    
    // There are 2 classes, 1 interface, 1 enum, and 1 namespace
    // The dominant type is class
    assert.strictEqual(result.value, 1); // 1 is the code for class
    assert.strictEqual(result.label, 'Class');
  });

  test('Should handle different access modifiers', () => {
    const document = createMockDocument(`
      public class PublicClass {}
      private class PrivateClass {}
      internal class InternalClass {}
      protected class ProtectedClass {}
    `);
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 1); // 1 is the code for class
    assert.strictEqual(result.label, 'Class');
  });

  test('Should handle abstract and sealed classes', () => {
    const document = createMockDocument(`
      public abstract class AbstractClass {}
      public sealed class SealedClass {}
    `);
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 1); // 1 is the code for class
    assert.strictEqual(result.label, 'Class');
  });

  test('Should handle static classes', () => {
    const document = createMockDocument(`
      public static class StaticClass {}
    `);
    const result = ObjectTypeMetric.extract(document);
    
    assert.strictEqual(result.value, 1); // 1 is the code for class
    assert.strictEqual(result.label, 'Class');
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
