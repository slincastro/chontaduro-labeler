import * as assert from 'assert';
import * as vscode from 'vscode';
import { NestingDepthMetric } from '../../metrics/NestingDepthMetric';

suite('NestingDepthMetric Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = NestingDepthMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Profundidad máxima de bloques anidados');
  });

  test('Should return 0 for document with no nesting', () => {
    const document = createMockDocument(`
      // This is a comment
      const x = 5;
      console.log(x);
      
      function testFunction() {
        return true;
      }
    `);
    const result = NestingDepthMetric.extract(document);
    
    assert.strictEqual(result.value, 1); // Function body is at depth 1
  });

  test('Should calculate simple nesting depth correctly', () => {
    const document = createMockDocument(`
      function testFunction() {
        if (true) {
          console.log('Condition is true');
        }
      }
    `);
    const result = NestingDepthMetric.extract(document);
    
    assert.strictEqual(result.value, 2); // Function body (1) + if block (1) = 2
  });

  test('Should calculate complex nesting depth correctly', () => {
    const document = createMockDocument(`
      function testFunction() {
        if (x > 0) {
          for (let i = 0; i < x; i++) {
            if (i % 2 === 0) {
              while (someCondition) {
                doSomething();
              }
            }
          }
        }
      }
    `);
    const result = NestingDepthMetric.extract(document);
    
    assert.strictEqual(result.value, 5); // Function(1) + if(1) + for(1) + if(1) + while(1) = 5
  });

  test('Should ignore braces in comments and strings', () => {
    const document = createMockDocument(`
      function testFunction() {
        // This is a comment with { nested braces }
        const str = "This is a string with { nested braces }";
        console.log("if (x > 0) { doSomething(); }");
        /* 
         * Multi-line comment with
         * { deeply { nested { braces } } }
         */
        
        if (true) {
          console.log('Condition is true');
        }
      }
    `);
    const result = NestingDepthMetric.extract(document);
    
    assert.strictEqual(result.value, 2); // Function body (1) + if block (1) = 2
  });

  test('Should handle mismatched braces gracefully', () => {
    const document = createMockDocument(`
      function testFunction() {
        if (true) {
          console.log('Condition is true');
        } // Closing brace for if
      } // Closing brace for function
      } // Extra closing brace
    `);
    const result = NestingDepthMetric.extract(document);
    
    assert.strictEqual(result.value, 2); // Function body (1) + if block (1) = 2
  });

  test('Should handle multiple code blocks at the same level', () => {
    const document = createMockDocument(`
      function testFunction() {
        if (condition1) {
          doSomething();
        }
        
        if (condition2) {
          doSomethingElse();
        }
        
        if (condition3) {
          doAnotherThing();
        }
      }
    `);
    const result = NestingDepthMetric.extract(document);
    
    assert.strictEqual(result.value, 2); // Function body (1) + if block (1) = 2
  });

  test('Should handle nested object literals', () => {
    const document = createMockDocument(`
      const config = {
        options: {
          display: {
            theme: {
              colors: {
                primary: '#000000',
                secondary: '#ffffff'
              }
            }
          }
        }
      };
    `);
    const result = NestingDepthMetric.extract(document);
    
    assert.strictEqual(result.value, 5); // Object literals count as nesting levels
  });

  test('Should handle class definitions with methods', () => {
    const document = createMockDocument(`
      class TestClass {
        constructor() {
          this.value = 10;
        }
        
        testMethod() {
          if (this.value > 0) {
            for (let i = 0; i < this.value; i++) {
              console.log(i);
            }
          }
        }
      }
    `);
    const result = NestingDepthMetric.extract(document);
    
    assert.strictEqual(result.value, 4); // Class(1) + method(1) + if(1) + for(1) = 4
  });

  test('Should handle arrow functions', () => {
    const document = createMockDocument(`
      const testFunction = () => {
        if (condition) {
          return items.map(item => {
            return {
              id: item.id,
              value: item.value
            };
          });
        }
      };
    `);
    const result = NestingDepthMetric.extract(document);
    
    assert.strictEqual(result.value, 4); // Arrow function(1) + if(1) + map callback(1) + object literal(1) = 4
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
