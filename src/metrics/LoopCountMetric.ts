import { MetricExtractor, MetricResult } from './MetricExtractor';
import * as vscode from 'vscode';

export const LoopCountMetric: MetricExtractor = {
  name: 'loopCount',
  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    
    // Remove comments to avoid counting loops in comments
    const textWithoutComments = text
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
    
    // Count for, while, and do-while loops (avoiding counting the 'while' in 'do-while' twice)
    const forRegex = /\bfor\s*\(/g;
    const whileRegex = /\bwhile\s*\(/g;
    const doWhileRegex = /\bdo\s*\{[^}]*\}\s*while\s*\(/g;
    
    // Count standalone while loops (not part of do-while)
    const allWhileMatches = (textWithoutComments.match(whileRegex) || []).length;
    const doWhileMatches = (textWithoutComments.match(doWhileRegex) || []).length;
    const standaloneWhileMatches = allWhileMatches - doWhileMatches;
    
    // Total loop count: for + standalone while + do-while
    const forMatches = (textWithoutComments.match(forRegex) || []).length;
    const loopMatches = forMatches + standaloneWhileMatches + doWhileMatches;
    
    // Count forEach method calls
    const forEachRegex = /\.forEach\s*\(/g;
    const forEachMatches = (textWithoutComments.match(forEachRegex) || []).length;
    
    return {
      label: 'Bucles (for/while/do/forEach)',
      value: loopMatches + forEachMatches,
    };
  },
};
