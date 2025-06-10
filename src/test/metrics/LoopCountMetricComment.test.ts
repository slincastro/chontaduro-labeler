import * as assert from 'assert';
import * as vscode from 'vscode';
import { LoopCountMetric } from '../../metrics/common/LoopCountMetric';

suite('LoopCountMetric Comment Test Suite', () => {

  async function getMetricValueFromText(text: string): Promise<number> {
    const doc = await vscode.workspace.openTextDocument({ content: text });
    const result = LoopCountMetric.extract(doc);
    return result.value;
  }

  test('No debe contar bucles en comentarios con chat_context', async () => {
    const code = `
      // chat_context: Optional chat context for maintaining conversation history
      // This is a comment with the word for in it
      /* 
       * Another comment with while loop syntax
       * for (let i = 0; i < items.length; i++) {
       *   console.log(items[i]);
       * }
       */
      
      // Real code with loops
      for (let i = 0; i < 10; i++) {
        console.log(i);
      }
    `;
    const value = await getMetricValueFromText(code);
    assert.strictEqual(value, 1); // Should only count the real for loop, not the ones in comments
  });

  test('No debe contar bucles en comentarios con orchestrator', async () => {
    const code = `
      // orchestrator: The orchestrator to use for search operations
      // This is another comment with the word for in it
      
      // Real code with loops
      for (let i = 0; i < 10; i++) {
        console.log(i);
      }
    `;
    const value = await getMetricValueFromText(code);
    assert.strictEqual(value, 1); // Should only count the real for loop, not the ones in comments
  });

  test('No debe contar la palabra for en comentarios', async () => {
    const code = `
      // This comment has the word for in it
      // orchestrator: The orchestrator to use for search operations
      // chat_context: Optional chat context for maintaining conversation history
      
      // No real loops in this code
      const text = "This is just text";
    `;
    const value = await getMetricValueFromText(code);
    assert.strictEqual(value, 0); // Should not count any loops since they're all in comments
  });

});
