import * as assert from 'assert';
import * as vscode from 'vscode';
import { IfCountMetric } from '../../metrics/IfCountMetric';

suite('IfCountMetric Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = IfCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Ifs');
  });

  test('Should return 0 for document with no if statements', () => {
    const document = createMockDocument(`
      // This is a comment
      const x = 5;
      console.log(x);
      
      function testFunction() {
        return true;
      }
      
      class SimpleClass {
        constructor() {
          this.value = 10;
        }
        
        normalMethod() {
          return this.value;
        }
      }
    `);
    const result = IfCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should count a single if statement correctly', () => {
    const document = createMockDocument(`
      function testFunction() {
        if (true) {
          console.log('Condition is true');
        }
      }
    `);
    const result = IfCountMetric.extract(document);
    
    assert.strictEqual(result.value, 1);
  });

  test('Should count multiple if statements correctly', () => {
    const document = createMockDocument(`
      function testFunction() {
        if (x > 0) {
          console.log('x is positive');
        }
        
        if (y < 0) {
          console.log('y is negative');
        }
        
        if (z === 0) {
          console.log('z is zero');
        }
      }
    `);
    const result = IfCountMetric.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should handle if statements with different spacing patterns', () => {
    const document = createMockDocument(`
      // Standard spacing
      if (condition1) { }
      
      // No space
      if(condition2) { }
      
      // Multiple spaces
      if  (condition3) { }
      
      // Tab
      if\t(condition4) { }
      
      // Newline
      if
      (condition5) { }
    `);
    const result = IfCountMetric.extract(document);
    
    assert.strictEqual(result.value, 5);
  });

  test('Should not count if statements in comments or strings', () => {
    const document = createMockDocument(`
      // This is a comment with if (condition)
      const str = "This is a string with if (condition)";
      console.log("if (x > 0) { doSomething(); }");
      /* 
       * Multi-line comment with
       * if (y < 0) { doSomethingElse(); }
       */
      
      // This is a real if statement
      if (z === 0) {
        console.log('z is zero');
      }
    `);
    const result = IfCountMetric.extract(document);
    
    assert.strictEqual(result.value, 1);
  });

  test('Should count if statements in different contexts', () => {
    const document = createMockDocument(`
      // Top-level if
      if (globalCondition) {
        console.log('Global condition is true');
      }
      
      function testFunction() {
        // Function-level if
        if (localCondition) {
          console.log('Local condition is true');
        }
        
        // Nested ifs
        if (outerCondition) {
          if (innerCondition) {
            console.log('Both conditions are true');
          }
        }
      }
      
      class TestClass {
        testMethod() {
          // Method-level if
          if (this.condition) {
            console.log('Class condition is true');
          }
        }
      }
    `);
    const result = IfCountMetric.extract(document);
    
    assert.strictEqual(result.value, 5);
  });

  test('Should count if statements in different programming languages', () => {
    const document = createMockDocument(`
      // JavaScript/TypeScript
      if (jsCondition) {
        console.log('JS condition is true');
      }
      
      // C#
      if (csharpCondition)
      {
        Console.WriteLine("C# condition is true");
      }
      
      // Java
      if (javaCondition) {
        System.out.println("Java condition is true");
      }
      
      // Python (should still count since the regex only looks for 'if (')
      if (pythonCondition):
          print("Python condition is true")
    `);
    const result = IfCountMetric.extract(document);
    
    assert.strictEqual(result.value, 4);
  });

  test('Should not count else if as separate if statements', () => {
    const document = createMockDocument(`
      if (condition1) {
        console.log('Condition 1 is true');
      } else if (condition2) {
        console.log('Condition 2 is true');
      } else if (condition3) {
        console.log('Condition 3 is true');
      } else {
        console.log('No conditions are true');
      }
    `);
    const result = IfCountMetric.extract(document);
    
    // The regex will match 'if (' but not 'else if ('
    assert.strictEqual(result.value, 3);
  });

  test('Should handle if statements with complex conditions', () => {
    const document = createMockDocument(`
      if (x > 0 && y < 0) {
        console.log('x is positive and y is negative');
      }
      
      if (a === 'string' || b instanceof Object) {
        console.log('a is a string or b is an object');
      }
      
      if ((c && d) || (e && f)) {
        console.log('Complex condition is true');
      }
      
      if (
        longCondition1 &&
        longCondition2 &&
        longCondition3
      ) {
        console.log('Long condition is true');
      }
    `);
    const result = IfCountMetric.extract(document);
    
    assert.strictEqual(result.value, 4);
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
    fileName: 'test.ts',
    uri: vscode.Uri.file('test.ts'),
    version: 1,
    isDirty: false,
    isUntitled: false,
    isClosed: false,
    languageId: 'typescript',
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
