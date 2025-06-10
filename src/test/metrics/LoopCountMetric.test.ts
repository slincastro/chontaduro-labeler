import * as assert from 'assert';
import * as vscode from 'vscode';
import { LoopCountMetric } from '../../metrics/common/LoopCountMetric';

suite('LoopCountMetric Test Suite', () => {

  async function getMetricValueFromText(text: string): Promise<number> {
    const doc = await vscode.workspace.openTextDocument({ content: text });
    const result = LoopCountMetric.extract(doc);
    return result.value;
  }

  test('Debe contar bucles for, while y do', async () => {
    const code = `
      for (let i = 0; i < 10; i++) {}
      while (true) {}
      do {} while (false);
    `;
    const value = await getMetricValueFromText(code);
    assert.strictEqual(value, 3);
  });

  test('Debe contar foreach como un solo bucle', async () => {
    const code = `
      const items = [1, 2, 3];
      items.forEach(item => console.log(item));
    `;
    const value = await getMetricValueFromText(code);
    assert.strictEqual(value, 1); // "foreach" aparece en "forEach"
  });

  test('No debe contar palabras parecidas que no son bucles', async () => {
    const code = `
      const format = "format text";
      const doSomething = () => {};
      let word = "forward";
    `;
    const value = await getMetricValueFromText(code);
    assert.strictEqual(value, 0);
  });

  test('Debe ignorar bucles en comentarios', async () => {
    const code = `
      // for (let i = 0; i < 10; i++) {}
      /* while (true) {} */
      const text = "do something";
    `;
    const value = await getMetricValueFromText(code);
    assert.strictEqual(value, 0); // si no se ignoran, esto será incorrecto
  });

  test('Debe retornar 0 en archivos vacíos', async () => {
    const value = await getMetricValueFromText('');
    assert.strictEqual(value, 0);
  });

  test('Debe detectar múltiples for y while combinados', async () => {
    const code = `
      for (let i = 0; i < 10; i++) {
        while (i < 5) {
          for (let j = 0; j < 3; j++) {}
        }
      }
    `;
    const value = await getMetricValueFromText(code);
    assert.strictEqual(value, 3);
  });

});