import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConstructorCountMetric } from '../../metrics/common/ConstructorCountMetric';

suite('ConstructorCountMetric Test Suite', () => {
  test('Should count constructors in a class', () => {
    const document = createMockDocument(`
      public class TestClass
      {
        private int _field;
        
        public TestClass()
        {
          _field = 0;
        }
        
        public TestClass(int value)
        {
          _field = value;
        }
      }
    `);
    const result = ConstructorCountMetric.extract(document);
    
    assert.strictEqual(result.value, 2);
  });

  test('Should handle multiple classes with constructors', () => {
    const document = createMockDocument(`
      public class Class1
      {
        public Class1() { }
      }

      public class Class2
      {
        public Class2() { }
        public Class2(int x) { }
      }
    `);
    const result = ConstructorCountMetric.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should handle class with no constructors', () => {
    const document = createMockDocument(`
      public class EmptyClass
      {
        public void Method() { }
      }
    `);
    const result = ConstructorCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should handle empty document', () => {
    const document = createMockDocument('');
    const result = ConstructorCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should not count methods with same name as other classes', () => {
    const document = createMockDocument(`
      public class Class1
      {
        public Class1() { }
        public Class1(int x) { }
        
        // This is a method, not a constructor
        public void Class2() { }
      }
      
      public class Class2
      {
        public Class2() { }
      }
    `);
    const result = ConstructorCountMetric.extract(document);
    
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
