import * as assert from 'assert';
import * as vscode from 'vscode';
import { LineCountMetric } from '../../metrics/common/LineCountMetric';

suite('LineCountMetric Test Suite', () => {
  test('Debe contar correctamente las líneas de un documento', async () => {
    const text = `Línea 1
Línea 2
Línea 3`;

    const doc = await vscode.workspace.openTextDocument({ content: text });
    const result = LineCountMetric.extract(doc);

    assert.strictEqual(result.label, 'Líneas');
    assert.strictEqual(result.value, 3); 
  });

  test('Debe retornar 0 para un documento vacío', async () => {
    const doc = await vscode.workspace.openTextDocument({ content: '' });
    const result = LineCountMetric.extract(doc);

    assert.strictEqual(result.label, 'Líneas');
    assert.strictEqual(result.value, 1); 
  });
});