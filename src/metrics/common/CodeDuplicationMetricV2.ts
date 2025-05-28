import { Metric, MetricResult } from '../Metric';
import * as vscode from 'vscode';
import * as crypto from 'crypto';

export const CodeDuplicationMetricV2: Metric = {
  name: 'codeDuplicationV2',
  description: 'Detecta bloques duplicados de código normalizado en el archivo.',

  extract(document: vscode.TextDocument): MetricResult {
    const text = document.getText();
    const lines = text.split('\n');

    const MIN_BLOCK_SIZE = 3;
    const normalizedBlocks = new Map<string, number[]>();
    let duplicatedLineCount = 0;
    const duplicatedLines: number[] = [];

    function normalizeLine(line: string): string {
      return line
        .replace(/\/\/.*$/g, '')     // remove single-line comments
        .replace(/\/\*.*?\*\//g, '') // remove inline block comments
        .replace(/(["'`])(?:(?!\1|\\).|\\.)*\1/g, 'STR') // replace strings
        .replace(/\b\d+\b/g, 'NUM')  // replace numbers
        .replace(/\b\w+\b/g, 'VAR')  // replace variable names
        .replace(/\s+/g, ' ')        // normalize spaces
        .trim();
    }

    for (let i = 0; i <= lines.length - MIN_BLOCK_SIZE; i++) {
      const block = lines
        .slice(i, i + MIN_BLOCK_SIZE)
        .map(normalizeLine)
        .filter(line => line !== '')
        .join('\n');

      if (block.length < 20) continue;

      const hash = crypto.createHash('md5').update(block).digest('hex');

      if (normalizedBlocks.has(hash)) {
        duplicatedLineCount += MIN_BLOCK_SIZE;
        normalizedBlocks.get(hash)?.push(i);
        
        // Add the duplicated lines to the array
        for (let j = 0; j < MIN_BLOCK_SIZE; j++) {
          duplicatedLines.push(i + j);
        }
      } else {
        normalizedBlocks.set(hash, [i]);
      }
    }

    // Find all duplicated blocks (blocks with more than one occurrence)
    const duplicatedBlocks: { startLine: number, endLine: number, blockId: string }[] = [];
    
    // Use letters for block identifiers
    const blockIdentifiers = 'abcdefghijklmnopqrstuvwxyz';
    let blockIdCounter = 0;
    
    normalizedBlocks.forEach((lineIndices, hash) => {
      if (lineIndices.length > 1) {
        // Generate a unique identifier for this set of duplicated blocks
        // If we have more than 26 sets, we'll start using a1, a2, etc.
        let blockId: string;
        if (blockIdCounter < blockIdentifiers.length) {
          blockId = blockIdentifiers[blockIdCounter];
        } else {
          // For blockIdCounter >= 26, use a1, a2, etc.
          const letterIndex = blockIdCounter % blockIdentifiers.length;
          const numberSuffix = Math.floor(blockIdCounter / blockIdentifiers.length);
          blockId = blockIdentifiers[letterIndex] + numberSuffix;
        }
        
        blockIdCounter++;
        
        // For each occurrence of this duplicated block
        lineIndices.forEach(startLine => {
          duplicatedBlocks.push({
            startLine,
            endLine: startLine + MIN_BLOCK_SIZE - 1,
            blockId: blockId
          });
        });
      }
    });

    const totalNonEmptyLines = lines.filter(line => line.trim() !== '').length;

    const duplicationPercentage = totalNonEmptyLines > 0
      ? (duplicatedLineCount / totalNonEmptyLines) * 100
      : 0;

    return {
      label: 'Porcentaje de código duplicado v2 (%)',
      value: Math.round(duplicationPercentage * 100) / 100,
      duplicatedBlocks: duplicatedBlocks
    };
  },
};
