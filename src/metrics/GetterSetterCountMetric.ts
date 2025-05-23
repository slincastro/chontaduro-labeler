import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const GetterSetterCountMetric: MetricExtractor = {
  name: 'getterSetterCount',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    
    // Count C# auto-properties and explicit properties
    const csharpAutoPropertyRegex = /\s*(?:public|private|protected|internal)\s+\w+\s+\w+\s*{\s*(?:get|set)\s*;\s*(?:get|set)\s*;\s*}/gm;
    const csharpExplicitGetterRegex = /\s*(?:public|private|protected|internal)\s+\w+\s+\w+\s*{\s*get\s*{[^}]*}\s*(?:set\s*{[^}]*})?\s*}/gm;
    const csharpExplicitSetterRegex = /\s*(?:public|private|protected|internal)\s+\w+\s+\w+\s*{\s*(?:get\s*{[^}]*})?\s*set\s*{[^}]*}\s*}/gm;
    
    // Count Java-style getters and setters
    const javaGetterRegex = /\s*(?:public|private|protected)\s+\w+\s+get\w+\s*\(\s*\)\s*{[^}]*}/gm;
    const javaSetterRegex = /\s*(?:public|private|protected)\s+void\s+set\w+\s*\(\s*\w+\s+\w+\s*\)\s*{[^}]*}/gm;
    
    // Count TypeScript/JavaScript getters and setters
    const tsJsGetterRegex = /\s*get\s+\w+\s*\(\s*\)\s*{[^}]*}/gm;
    const tsJsSetterRegex = /\s*set\s+\w+\s*\(\s*\w+\s*\)\s*{[^}]*}/gm;
    
    // Match all patterns
    const csharpAutoProperties = text.match(csharpAutoPropertyRegex) || [];
    const csharpExplicitGetters = text.match(csharpExplicitGetterRegex) || [];
    const csharpExplicitSetters = text.match(csharpExplicitSetterRegex) || [];
    const javaGetters = text.match(javaGetterRegex) || [];
    const javaSetters = text.match(javaSetterRegex) || [];
    const tsJsGetters = text.match(tsJsGetterRegex) || [];
    const tsJsSetters = text.match(tsJsSetterRegex) || [];
    
    // Count total getters and setters
    // Note: For C# auto-properties, each match counts as both a getter and setter
    const totalCount = 
      csharpAutoProperties.length * 2 + // Each auto-property has both getter and setter
      csharpExplicitGetters.length +
      csharpExplicitSetters.length +
      javaGetters.length +
      javaSetters.length +
      tsJsGetters.length +
      tsJsSetters.length;
    
    return {
      label: 'Getters y Setters',
      value: totalCount,
    };
  },
};
