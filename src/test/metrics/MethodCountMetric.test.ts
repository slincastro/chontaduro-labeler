import * as assert from 'assert';
import * as vscode from 'vscode';
import { MethodCountMetric } from '../../metrics/common/MethodCountMetric';

suite('MethodCountMetric Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = MethodCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Cantidad de métodos');
  });

  test('Should return 0 for document with no methods', () => {
    const document = createMockDocument(`
      // This is a comment
      const x = 5;
      console.log(x);
      
      class SimpleClass {
        constructor() {
          this.value = 10;
        }
      }
    `);
    const result = MethodCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should count a single method correctly', () => {
    const document = createMockDocument(`
      public class TestClass {
        public void TestMethod() {
          Console.WriteLine("Test");
        }
      }
    `);
    const result = MethodCountMetric.extract(document);
    
    assert.strictEqual(result.value, 1);
  });

  test('Should count multiple methods correctly', () => {
    const document = createMockDocument(`
      public class TestClass {
        public void Method1() {
          Console.WriteLine("Method1");
        }
        
        private int Method2() {
          return 42;
        }
        
        protected string Method3() {
          return "Method3";
        }
      }
    `);
    const result = MethodCountMetric.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should handle methods with different access modifiers', () => {
    const document = createMockDocument(`
      class TestClass {
        public void PublicMethod() { }
        private void PrivateMethod() { }
        protected void ProtectedMethod() { }
        internal void InternalMethod() { }
        void DefaultMethod() { }
      }
    `);
    const result = MethodCountMetric.extract(document);
    
    assert.strictEqual(result.value, 5);
  });

  test('Should handle methods with additional modifiers', () => {
    const document = createMockDocument(`
      class TestClass {
        public static void StaticMethod() { }
        public virtual void VirtualMethod() { }
        public override void OverrideMethod() { }
        public async Task AsyncMethod() { }
        public new void NewMethod() { }
      }
    `);
    const result = MethodCountMetric.extract(document);
    
    assert.strictEqual(result.value, 5);
  });

  test('Should handle methods with different return types', () => {
    const document = createMockDocument(`
      class TestClass {
        public void VoidMethod() { }
        public int IntMethod() { return 0; }
        public string StringMethod() { return ""; }
        public bool BoolMethod() { return true; }
        public List<int> GenericMethod() { return new List<int>(); }
        public int[] ArrayMethod() { return new int[0]; }
      }
    `);
    const result = MethodCountMetric.extract(document);
    
    assert.strictEqual(result.value, 6);
  });

  test('Should handle methods with different parameter patterns', () => {
    const document = createMockDocument(`
      class TestClass {
        public void NoParams() { }
        public void SingleParam(int x) { }
        public void MultipleParams(int x, string y, bool z) { }
        public void OptionalParams(int x = 0, string y = "") { }
        public void ParamsArray(params int[] numbers) { }
        public void GenericParams<T>(T item) { }
        public void RefParams(ref int x, out string y) { }
      }
    `);
    const result = MethodCountMetric.extract(document);
    
    assert.strictEqual(result.value, 6);
  });

  test('Should not count method references in code', () => {
    const document = createMockDocument(`
      class TestClass {
        public void RealMethod() {
          // These should not be counted as method declarations
          var str = "void FakeMethod() {}";
          var comment = // void CommentMethod() {}
          /* void MultiLineCommentMethod() {} */
          if (someVar == "method") { }
        }
      }
    `);
    const result = MethodCountMetric.extract(document);
    
    assert.strictEqual(result.value, 1);
  });

  test('Should handle arrow function methods', () => {
    const document = createMockDocument(`
      class TestClass {
        public int ArrowMethod() => 42;
        public string ArrowStringMethod() => "Hello";
        public void ArrowVoidMethod() => Console.WriteLine("Arrow");
      }
    `);
    const result = MethodCountMetric.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should handle methods in different contexts', () => {
    const document = createMockDocument(`
      // Top-level method
      public void TopLevelMethod() { }
      
      class OuterClass {
        private void OuterMethod() { }
        
        class NestedClass {
          protected void NestedMethod() { }
        }
        
        interface ITestInterface {
          void InterfaceMethod();
        }
        
        struct TestStruct {
          public void StructMethod() { }
        }
      }
      
      namespace TestNamespace {
        class NamespaceClass {
          internal void NamespaceMethod() { }
        }
      }
    `);
    const result = MethodCountMetric.extract(document);
    
    assert.strictEqual(result.value, 5);
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
