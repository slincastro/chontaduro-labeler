import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MessageHandler } from './MessageHandlerRegistry';
import { MetricFactory } from '../metrics/MetricFactory';

/**
 * Interface for the LineCountViewProvider to avoid circular dependencies
 */
export interface ILineCountViewProvider {
  _view?: vscode.WebviewView;
  navigationManager: any;
  needsRefactoring: boolean;
  currentLanguageInfo?: any;
  update(): void;
  navigateFile(direction: 'next' | 'prev'): Promise<void>;
  openCsvFile(): void;
  sendSettings(): void;
  saveSettings(settings: { apiKey: string, model: string }): void;
  highlightDuplicatedCode(document: vscode.TextDocument, duplicatedBlocks: { startLine: number, endLine: number, blockId?: string }[]): void;
  highlightLoops(document: vscode.TextDocument, loopBlocks: { startLine: number, endLine: number, loopType: string }[]): void;
  highlightMethods(document: vscode.TextDocument, methodBlocks: { startLine: number, endLine: number, size: number, name?: string }[]): void;
}

/**
 * Handler for the 'navigate' message
 */
export class NavigateHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    provider.navigateFile(message.direction);
    return true;
  }
}

/**
 * Handler for the 'toggleRefactoring' message
 */
export class ToggleRefactoringHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    provider.needsRefactoring = message.checked;
    return true;
  }
}

/**
 * Handler for the 'webviewReady' message
 */
export class WebviewReadyHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    if (provider.currentLanguageInfo && provider._view) {
      provider._view.webview.postMessage({
        command: 'setLanguageInfo',
        name: provider.currentLanguageInfo.name,
        icon: provider.currentLanguageInfo.icon,
        color: provider.currentLanguageInfo.color
      });
    }
    return true;
  }
}

/**
 * Handler for the 'openCsvFile' message
 */
export class OpenCsvFileHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    provider.openCsvFile();
    return true;
  }
}

/**
 * Handler for the 'getSettings' message
 */
export class GetSettingsHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    provider.sendSettings();
    return true;
  }
}

/**
 * Handler for the 'saveSettings' message
 */
export class SaveSettingsHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    provider.saveSettings(message.settings);
    return true;
  }
}

/**
 * Handler for the 'startOpenAIRequest' message
 */
export class StartOpenAIRequestHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    vscode.commands.executeCommand('chontaduro.startLoading');
    return true;
  }
}

/**
 * Handler for the 'endOpenAIRequest' message
 */
export class EndOpenAIRequestHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    vscode.commands.executeCommand('chontaduro.stopLoading');
    provider.update();
    return true;
  }
}

/**
 * Handler for the 'highlightDuplicatedCode' message
 */
export class HighlightDuplicatedCodeHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    if (!provider.navigationManager.currentFile) return false;
    
    const uri = provider.navigationManager.currentFile;
    vscode.workspace.openTextDocument(uri).then(document => {
      const metrics = MetricFactory.getMetricsForLanguage(document.languageId.toLowerCase());
      const codeDuplicationMetric = metrics.find(m => m.name === 'codeDuplicationV2');
      
      if (codeDuplicationMetric) {
        const result = codeDuplicationMetric.extract(document);
        if (result.duplicatedBlocks && result.duplicatedBlocks.length > 0) {
          provider.highlightDuplicatedCode(document, result.duplicatedBlocks);
        } else {
          vscode.window.showInformationMessage('No se encontraron bloques de código duplicados.');
        }
      }
    });
    
    return true;
  }
}

/**
 * Handler for the 'highlightLoops' message
 */
export class HighlightLoopsHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    if (!provider.navigationManager.currentFile) return false;
    
    const uri = provider.navigationManager.currentFile;
    vscode.workspace.openTextDocument(uri).then(document => {
      const metrics = MetricFactory.getMetricsForLanguage(document.languageId.toLowerCase());
      const loopCountMetric = metrics.find(m => m.name === 'loopCount');
      
      if (loopCountMetric) {
        const result = loopCountMetric.extract(document);
        if (result.loopBlocks && result.loopBlocks.length > 0) {
          provider.highlightLoops(document, result.loopBlocks);
        } else {
          vscode.window.showInformationMessage('No se encontraron bucles en el código.');
        }
      }
    });
    
    return true;
  }
}

/**
 * Handler for the 'highlightMethods' message
 */
export class HighlightMethodsHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    if (!provider.navigationManager.currentFile) return false;
    
    const uri = provider.navigationManager.currentFile;
    vscode.workspace.openTextDocument(uri).then(document => {
      const metrics = MetricFactory.getMetricsForLanguage(document.languageId.toLowerCase());
      const methodSizeMetric = metrics.find(m => 
        m.name === 'averageMethodSize' || m.name === 'averageMethodSizePython'
      );
      
      if (methodSizeMetric) {
        const result = methodSizeMetric.extract(document);
        if (result.methodBlocks && result.methodBlocks.length > 0) {
          provider.highlightMethods(document, result.methodBlocks);
        } else {
          vscode.window.showInformationMessage('No se encontraron métodos en el código.');
        }
      }
    });
    
    return true;
  }
}

/**
 * Handler for the 'highlightMaxDepth' message
 */
export class HighlightMaxDepthHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    if (!provider.navigationManager.currentFile) return false;
    
    const uri = provider.navigationManager.currentFile;
    vscode.workspace.openTextDocument(uri).then(document => {
      const metrics = MetricFactory.getMetricsForLanguage(document.languageId.toLowerCase());
      const complexityMetric = metrics.find(m => 
        m.name === 'cognitiveComplexity' || m.name === 'cognitiveComplexityPython'
      );
      
      if (complexityMetric) {
        const result = complexityMetric.extract(document);
        if (result.lineNumber !== undefined) {
          // Use the existing highlightMaxDepth method from the HighlightManager
          const editor = vscode.window.activeTextEditor;
          if (editor && editor.document.uri.toString() === document.uri.toString()) {
            const position = new vscode.Position(result.lineNumber, 0);
            const selection = new vscode.Selection(position, position);
            editor.selection = selection;
            editor.revealRange(
              new vscode.Range(position, position),
              vscode.TextEditorRevealType.InCenter
            );
            
            // Create a decoration for the line
            const highlightManager = vscode.window.createTextEditorDecorationType({
              backgroundColor: 'rgba(255, 87, 51, 0.2)',
              overviewRulerColor: 'rgba(255, 87, 51, 0.7)',
              overviewRulerLane: vscode.OverviewRulerLane.Right
            });
            
            const range = new vscode.Range(position, position);
            editor.setDecorations(highlightManager, [range]);
            
            // Dispose the decoration after 3 seconds
            setTimeout(() => {
              highlightManager.dispose();
            }, 3000);
          }
        } else {
          vscode.window.showInformationMessage('No se encontró una línea con alta complejidad.');
        }
      }
    });
    
    return true;
  }
}

/**
 * Handler for the 'highlightIfs' message
 */
export class HighlightIfsHandler implements MessageHandler {
  handle(message: any, provider: ILineCountViewProvider): boolean {
    if (!provider.navigationManager.currentFile) return false;
    
    const uri = provider.navigationManager.currentFile;
    vscode.workspace.openTextDocument(uri).then(document => {
      const metrics = MetricFactory.getMetricsForLanguage(document.languageId.toLowerCase());
      const ifCountMetric = metrics.find(m => m.name === 'ifCount');
      
      if (ifCountMetric) {
        const result = ifCountMetric.extract(document);
        if (result.loopBlocks && result.loopBlocks.length > 0) {
          provider.highlightLoops(document, result.loopBlocks);
        } else {
          vscode.window.showInformationMessage('No se encontraron declaraciones if en el código.');
        }
      }
    });
    
    return true;
  }
}
