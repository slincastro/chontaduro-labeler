import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommentRatioMetric } from '../../metrics/CommentRatioMetric';

suite('CommentRatioMetric Test Suite', () => {
  test('Should return 0 for empty document', () => {
    const document = createMockDocument('');
    const result = CommentRatioMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Ratio de comentarios (%)');
  });

  test('Should return 0 for document with no comments', () => {
    const document = createMockDocument(`
      const x = 5;
      console.log(x);
      
      function testFunction() {
        return true;
      }
    `);
    const result = CommentRatioMetric.extract(document);
    
    assert.strictEqual(result.value, 0);
  });

  test('Should calculate ratio correctly for document with single-line comments', () => {
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
    const result = CommentRatioMetric.extract(document);
    
    // 3 comment lines out of 11 total lines = 27.27%
    assert.strictEqual(result.value, 27.27);
  });

  test('Should calculate ratio correctly for document with multi-line comments', () => {
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
    const result = CommentRatioMetric.extract(document);
    
    // 4 comment lines out of 12 total lines = 33.33%
    assert.strictEqual(result.value, 33.33);
  });

  test('Should calculate ratio correctly for document with mixed comment types', () => {
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
    const result = CommentRatioMetric.extract(document);
    
    // 5 comment lines out of 13 total lines = 38.46%
    assert.strictEqual(result.value, 38.46);
  });

  test('Should calculate ratio correctly for document with inline comments', () => {
    const document = createMockDocument(`
      const x = 5; // This is an inline comment
      console.log(x); // Another inline comment
      
      function testFunction() { // Comment after function declaration
        return true;
      }
    `);
    const result = CommentRatioMetric.extract(document);
    
    // 3 comment lines out of 8 total lines = 37.5%
    assert.strictEqual(result.value, 37.5);
  });

  test('Should calculate ratio correctly for document with multi-line comments in the middle of a line', () => {
    const document = createMockDocument(`
      const x = /* This is a comment */ 5;
      console.log(/* Another comment */ x);
      
      function testFunction() {
        return /* Yet another comment */ true;
      }
    `);
    const result = CommentRatioMetric.extract(document);
    
    // 3 comment lines out of 8 total lines = 37.5%
    assert.strictEqual(result.value, 37.5);
  });

  test('Should not count comment markers inside string literals', () => {
    const document = createMockDocument(`
      const commentInString = "This is not a // comment";
      const anotherString = 'This is not a /* comment */ either';
      
      // This is an actual comment
      const multilineString = \`This is not a
      // comment inside a template literal\`;
    `);
    const result = CommentRatioMetric.extract(document);
    
    // 1 comment line out of 4 total lines = 25%
    assert.strictEqual(result.value, 25);
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
    const result = CommentRatioMetric.extract(document);
    
    // 12 comment lines out of 24 total lines = 50%
    assert.strictEqual(result.value, 50);
  });

  test('Should handle empty lines correctly in ratio calculation', () => {
    const document = createMockDocument(`
      // Comment 1
      
      const x = 5;
      
      // Comment 2
      
      console.log(x);
      
      // Comment 3
    `);
    const result = CommentRatioMetric.extract(document);
    
    // 3 comment lines out of 11 total lines = 27.27%
    assert.strictEqual(result.value, 27.27);
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
    const result = CommentRatioMetric.extract(document);
    
    // 4 comment lines out of 9 total lines = 44.44%
    assert.strictEqual(result.value, 44.44);
  });

  test('Should round the ratio to 2 decimal places', () => {
    const document = createMockDocument(`
      // This is a comment
      const x = 5;
      console.log(x);
      // Another comment
      const y = 10;
      console.log(y);
      // Yet another comment
    `);
    const result = CommentRatioMetric.extract(document);
    
    // 3 comment lines out of 9 total lines = 33.33%
    assert.strictEqual(result.value, 33.33);
    
    // Check that the value has at most 2 decimal places
    const valueString = result.value.toString();
    const decimalPart = valueString.includes('.') ? valueString.split('.')[1] : '';
    assert.strictEqual(decimalPart.length <= 2, true);
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
