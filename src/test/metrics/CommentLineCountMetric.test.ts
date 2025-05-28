import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommentLineCountMetric } from '../../metrics/common/CommentLineCountMetric';

suite('CommentLineCountMetric Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = CommentLineCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Líneas de comentarios');
  });

  test('Should return 0 for document with no comments', () => {
    const document = createMockDocument(`
      const x = 5;
      console.log(x);
      
      function testFunction() {
        return true;
      }
    `);
    const result = CommentLineCountMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should count single-line comments correctly', () => {
    const document = createMockDocument(`
      // This is a comment
      const x = 5;
      // This is another comment
      console.log(x);
      
      // Yet another comment
      function testFunction() {
        return true;
      }
    `);
    const result = CommentLineCountMetric.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should count multi-line comments correctly', () => {
    const document = createMockDocument(`
      /*
       * This is a multi-line comment
       * with multiple lines
       */
      const x = 5;
      console.log(x);
      
      function testFunction() {
        return true;
      }
    `);
    const result = CommentLineCountMetric.extract(document);
    
    assert.strictEqual(result.value, 4);
  });

  test('Should count mixed single-line and multi-line comments correctly', () => {
    const document = createMockDocument(`
      // This is a single-line comment
      const x = 5;
      /* This is a multi-line comment
       * with multiple lines
       */
      console.log(x);
      
      // Another single-line comment
      function testFunction() {
        return true;
      }
    `);
    const result = CommentLineCountMetric.extract(document);
    
    assert.strictEqual(result.value, 5);
  });

  test('Should count inline comments correctly', () => {
    const document = createMockDocument(`
      const x = 5; // This is an inline comment
      console.log(x); // Another inline comment
      
      function testFunction() { // Comment after function declaration
        return true;
      }
    `);
    const result = CommentLineCountMetric.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should count multi-line comments in the middle of a line correctly', () => {
    const document = createMockDocument(`
      const x = /* This is a comment */ 5;
      console.log(/* Another comment */ x);
      
      function testFunction() {
        return /* Yet another comment */ true;
      }
    `);
    const result = CommentLineCountMetric.extract(document);
    
    assert.strictEqual(result.value, 3);
  });

  test('Should not count comment markers inside string literals', () => {
    const document = createMockDocument(`
      const commentInString = "This is not a // comment";
      const anotherString = 'This is not a /* comment */ either';
      
      // This is an actual comment
      const multilineString = \`This is not a
      // comment inside a template literal\`;
    `);
    const result = CommentLineCountMetric.extract(document);
    
    assert.strictEqual(result.value, 2);
  });

  test('Should handle complex mixed code with comments correctly', () => {
    const document = createMockDocument(`
      // Start with a comment
      const x = 5;
      
      /* 
       * Multi-line comment
       * with several lines
       */
      function complexFunction() {
        // Comment inside function
        const y = x * 2; // Inline comment
        
        if (y > 5) { /* Another inline comment */ 
          console.log("y is greater than 5");
        }
        
        /*
         * Another multi-line comment
         */
        return y;
      }
      
      // Final comment
    `);
    const result = CommentLineCountMetric.extract(document);
    
    assert.strictEqual(result.value, 12);
  });

  test('Should handle comments with special characters correctly', () => {
    const document = createMockDocument(`
      // Comment with special chars: !@#$%^&*()_+
      const x = 5;
      
      /* Comment with
       * different languages: 你好, Привет, مرحبا
       */
      console.log(x);
    `);
    const result = CommentLineCountMetric.extract(document);
    
    assert.strictEqual(result.value, 4);
  });

  test('Should handle triple-slash comments correctly', () => {
    const document = createMockDocument(`
      /// <summary>
      /// This is a triple-slash comment
      /// Used for documentation
      /// </summary>
      function documentedFunction() {
        return true;
      }
    `);
    const result = CommentLineCountMetric.extract(document);
    
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
