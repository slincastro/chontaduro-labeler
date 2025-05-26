import * as assert from 'assert';
import * as vscode from 'vscode';
import { SingleResponsibilityMetric } from '../../metrics/SingleResponsibilityMetric';

suite('SingleResponsibilityMetric Test Suite', () => {
  test('Debe retornar valor 0 para un documento sin clase', async () => {
    const text = `
// Este es un archivo sin clase
function doSomething() {
  console.log('Hello world');
}
`;

    const doc = await vscode.workspace.openTextDocument({ content: text });
    const result = SingleResponsibilityMetric.extract(doc);

    assert.strictEqual(result.label, 'Responsabilidad Única');
    assert.strictEqual(result.value, 0);
  });

  test('Debe iniciar análisis para un documento con clase', async () => {
    const text = `
class MiClase {
  constructor() {
    this.value = 0;
  }
  
  metodo1() {
    return this.value;
  }
}
`;

    const doc = await vscode.workspace.openTextDocument({ content: text });
    const result = SingleResponsibilityMetric.extract(doc);

    // Verificamos que el resultado inicial sea 0 (el análisis se ejecuta de forma asíncrona)
    assert.strictEqual(result.label, 'Responsabilidad Única');
    assert.strictEqual(result.value, 0);
    
    // No podemos probar el resultado del análisis asíncrono en este test
    // ya que depende de la API de OpenAI
  });
});
