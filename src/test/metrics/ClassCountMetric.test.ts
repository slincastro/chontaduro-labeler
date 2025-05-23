import * as assert from 'assert';
import * as vscode from 'vscode';
import { ClassCountMetric } from '../../metrics/ClassCountMetric';

suite('ClassCountMetric Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = ClassCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Clases');
  });

  test('Should return 0 for document with no classes', () => {
    const document = createMockDocument(`
      // This is a comment
      const x = 5;
      console.log(x);
      
      function testFunction() {
        return true;
      }
    `);
    const result = ClassCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should count a single class correctly', () => {
    const document = createMockDocument(`
      public class TestClass {
        private int _field;
        
        public TestClass() {
          _field = 0;
        }
        
        public void TestMethod() {
          Console.WriteLine(_field);
        }
      }
    `);
    const result = ClassCountMetric.extract(document);
    
    assert.strictEqual(result.value, 1);
  });

  test('Should count multiple classes correctly', () => {
    const document = createMockDocument(`
      public class Class1 {
        public void Method1() { }
      }

      private class Class2 {
        public void Method2() { }
      }

      internal class Class3 {
        public void Method3() { }
      }
    `);
    const result = ClassCountMetric.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should handle classes with different access modifiers', () => {
    const document = createMockDocument(`
      public class PublicClass { }
      private class PrivateClass { }
      protected class ProtectedClass { }
      internal class InternalClass { }
      class DefaultClass { }
    `);
    const result = ClassCountMetric.extract(document);
    
    assert.strictEqual(result.value, 5);
  });

  test('Should handle classes with additional modifiers', () => {
    const document = createMockDocument(`
      public static class StaticClass { }
      public abstract class AbstractClass { }
      public sealed class SealedClass { }
      public final class FinalClass { }
      export class ExportedClass { }
    `);
    const result = ClassCountMetric.extract(document);
    
    assert.strictEqual(result.value, 5);
  });

  test('Should not count class references in code', () => {
    const document = createMockDocument(`
      public class RealClass {
        public void Method() {
          // These should not be counted as class declarations
          var str = "class MyClass";
          var comment = // class CommentClass
          /* class MultiLineCommentClass */
          if (someVar == "class") { }
        }
      }
    `);
    const result = ClassCountMetric.extract(document);
    
    assert.strictEqual(result.value, 1);
  });

  test('Should handle classes with generic types', () => {
    const document = createMockDocument(`
      public class GenericClass<T> {
        public T Value { get; set; }
      }

      public class ConstrainedGenericClass<T> where T : class {
        public T Value { get; set; }
      }
    `);
    const result = ClassCountMetric.extract(document);
    
    assert.strictEqual(result.value, 2);
  });

  test('Should handle nested classes', () => {
    const document = createMockDocument(`
      public class OuterClass {
        private int _field;
        
        public class NestedClass {
          public void NestedMethod() { }
        }
        
        private class AnotherNestedClass {
          public void AnotherNestedMethod() { }
        }
      }
    `);
    const result = ClassCountMetric.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should handle classes with inheritance', () => {
    const document = createMockDocument(`
      public class BaseClass {
        public virtual void BaseMethod() { }
      }
      
      public class DerivedClass : BaseClass {
        public override void BaseMethod() { }
      }
      
      public class AnotherDerivedClass extends BaseClass {
        public override void BaseMethod() { }
      }
    `);
    const result = ClassCountMetric.extract(document);
    
    assert.strictEqual(result.value, 3);
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
