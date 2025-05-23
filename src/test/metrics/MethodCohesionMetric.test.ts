import * as assert from 'assert';
import * as vscode from 'vscode';
import { MethodCohesionMetric } from '../../metrics/MethodCohesionMetric';

suite('MethodCohesionMetric Test Suite', () => {

  function createMockDocument(content: string): vscode.TextDocument {
    return {
      getText: () => content,
      lineCount: content.split('\n').length,
    } as vscode.TextDocument;
  }

  test('Should return 0 for empty document', () => {
    const doc = createMockDocument('');
    const result = MethodCohesionMetric.extract(doc);
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Cohesión promedio de métodos (%)');
  });

  test('Should return 0 when no class properties are found', () => {
    const doc = createMockDocument(`
      public class Example {
        public void Method() {
          int x = 1;
        }
      }
    `);
    const result = MethodCohesionMetric.extract(doc);
    assert.strictEqual(result.value, 0);
    assert.strictEqual(result.label, 'Cohesión promedio de métodos (%)');
  });

  test('Should return 0 when there are class properties but methods use none', () => {
    const doc = createMockDocument(`
      public class Example {
        public int Count { get; set; }
        public string Name { get; set; }

        public void DoNothing() {
          Console.WriteLine("Hello");
        }
      }
    `);
    const result = MethodCohesionMetric.extract(doc);
    assert.strictEqual(result.value, 0);
  });

  test('Should return 100 when a method uses all properties', () => {
    const doc = createMockDocument(`
      public class Example {
        public int Count { get; set; }
        public string Name { get; set; }

        public void DoWork() {
          Console.WriteLine(Count + Name);
        }
      }
    `);
    const result = MethodCohesionMetric.extract(doc);
    assert.strictEqual(result.value, 100);
  });

  test('Should return average when some methods use some properties', () => {
    const doc = createMockDocument(`
      public class Example {
        public int A { get; set; }
        public int B { get; set; }
        public int C { get; set; }

        public void Method1() {
          A = 5;
        }

        public void Method2() {
          Console.WriteLine(B + C);
        }
      }
    `);
    const result = MethodCohesionMetric.extract(doc);
    // Method1: 1/3 = 0.33, Method2: 2/3 = 0.67 → promedio = 0.5 → 50%
    assert.strictEqual(result.value, 50);
  });

  test('Should handle multiple methods and nested blocks correctly', () => {
    const doc = createMockDocument(`
      public class Example {
        public int X { get; set; }
        public int Y { get; set; }

        public void M1() {
          if (X > 0) {
            Console.WriteLine(Y);
          }
        }

        public void M2() {
          Console.WriteLine("No props");
        }
      }
    `);
    const result = MethodCohesionMetric.extract(doc);
    // M1 uses X and Y → 2/2, M2 uses 0 → (100 + 0) / 2 = 50%
    assert.strictEqual(result.value, 50);
  });

});