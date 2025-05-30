import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { StatusBarAlignment } from 'vscode';
import { MetricsCSVManager } from './csv/MetricsCSVManager';
import { MetricFactory } from './metrics/MetricFactory';
import { LanguageDetector, LanguageInfo } from './language/LanguageDetector';
import { NavigationManager } from './navigation/NavigationManager';
import { MetricsRenderer } from './metrics/MetricsRenderer';

const output = vscode.window.createOutputChannel("LineCounter");
output.appendLine('Canal LineCounter iniciado');

let statusBarItem: vscode.StatusBarItem;
let isLoading = false;

MetricFactory.initializeRegistry();

export function activate(context: vscode.ExtensionContext) {
  output.appendLine("Activando extensión chontaduro");
  
  statusBarItem = vscode.window.createStatusBarItem(StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(symbol-misc)";
  statusBarItem.tooltip = "Chontaduro Labeler";
  statusBarItem.command = 'lineCounterView.focus';
  context.subscriptions.push(statusBarItem);
  statusBarItem.show();

  statusBarItem.text = "$(symbol-misc)";
  
  const provider = new LineCountViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('lineCounterView', provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('lineCounterView.focus', () => {
      vscode.commands.executeCommand('workbench.view.extension.lineCounterContainer');
    })
  );

    vscode.window.onDidChangeActiveTextEditor(() => {
      if (provider.hasView) {
        provider.update();
      }
    });

    vscode.workspace.onDidChangeTextDocument(() => {
      if (provider.hasView) {
        provider.update();
      }
    });
    
  context.subscriptions.push(
    vscode.commands.registerCommand('lineCounterView.openSettings', () => {
      if (provider.hasView) {
        provider.openSettings();
      }
    })
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand('chontaduro.startLoading', () => {
      startLoading();
    })
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand('chontaduro.stopLoading', () => {
      stopLoading();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('lineCounterView.navigatePrevious', () => {
      if (provider.hasView) {
        provider.navigateFile('prev');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('lineCounterView.navigateNext', () => {
      if (provider.hasView) {
        provider.navigateFile('next');
      }
    })
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand('chontaduro.updateAIMetrics', () => {
      if (provider.hasView) {
        provider.update();
      }
    })
  );
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}

export function startLoading() {
  if (isLoading) {
    return;
  }
  
  isLoading = true;
  statusBarItem.text = "$(sync~spin)";
}

export function stopLoading() {
  isLoading = false;
  statusBarItem.text = "$(symbol-misc)";
}


class LineCountViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private navigationManager: NavigationManager;
  private csvManager: MetricsCSVManager;
  private needsRefactoring: boolean = false;
  private metricsRenderer: MetricsRenderer;

  constructor(private readonly _extensionUri: vscode.Uri) {
    const defaultMetrics = MetricFactory.getCommonMetrics();
    this.navigationManager = new NavigationManager(this._extensionUri, output);
    this.csvManager = new MetricsCSVManager(defaultMetrics, output);
    this.metricsRenderer = new MetricsRenderer(this._extensionUri, output);
  }

  public get hasView(): boolean {
    return !!this._view;
  }

  private currentLanguageInfo?: LanguageInfo;

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.onDidReceiveMessage(message => {
      output.appendLine(`Received message from webview: ${message.command}`);
      
      if (message.command === 'navigate') {
        this.navigateFile(message.direction);
      } else if (message.command === 'toggleRefactoring') {
        this.needsRefactoring = message.checked;
      } else if (message.command === 'webviewReady') {
        
        if (this.currentLanguageInfo && this._view) {
          output.appendLine(`Sending language info after webview ready: ${this.currentLanguageInfo.name}`);
          this._view.webview.postMessage({
            command: 'setLanguageInfo',
            name: this.currentLanguageInfo.name,
            icon: this.currentLanguageInfo.icon,
            color: this.currentLanguageInfo.color
          });
        }
      } else if (message.command === 'openCsvFile') {
        this.openCsvFile();
      } else if (message.command === 'getSettings') {
        this.sendSettings();
      } else if (message.command === 'saveSettings') {
        this.saveSettings(message.settings);
      } else if (message.command === 'startOpenAIRequest') {
        vscode.commands.executeCommand('chontaduro.startLoading');
      } else if (message.command === 'endOpenAIRequest') {
        vscode.commands.executeCommand('chontaduro.stopLoading');
        this.update(); 
      } else if (message.command === 'highlightDuplicatedCode') {
        if (!this.navigationManager.currentFile) return;
        
        const uri = this.navigationManager.currentFile;
        vscode.workspace.openTextDocument(uri).then(document => {
          const metrics = MetricFactory.getMetricsForLanguage(document.languageId.toLowerCase());
          const codeDuplicationMetric = metrics.find(m => m.name === 'codeDuplicationV2');
          
          if (codeDuplicationMetric) {
            const result = codeDuplicationMetric.extract(document);
            if (result.duplicatedBlocks && result.duplicatedBlocks.length > 0) {
              this.highlightDuplicatedCode(document, result.duplicatedBlocks);
            } else {
              vscode.window.showInformationMessage('No se encontraron bloques de código duplicados.');
            }
          }
        });
      } else if (message.command === 'highlightLoops') {
        if (!this.navigationManager.currentFile) return;
                const uri = this.navigationManager.currentFile;
        vscode.workspace.openTextDocument(uri).then(document => {
          const metrics = MetricFactory.getMetricsForLanguage(document.languageId.toLowerCase());
          const loopCountMetric = metrics.find(m => m.name === 'loopCount');
          
          if (loopCountMetric) {
            const result = loopCountMetric.extract(document);
            if (result.loopBlocks && result.loopBlocks.length > 0) {
              this.highlightLoops(document, result.loopBlocks);
            } else {
              vscode.window.showInformationMessage('No se encontraron bucles en el código.');
            }
          }
        });
      } else if (message.command === 'highlightMethods') {
        if (!this.navigationManager.currentFile) return;
        
        const uri = this.navigationManager.currentFile;
        vscode.workspace.openTextDocument(uri).then(document => {
          const metrics = MetricFactory.getMetricsForLanguage(document.languageId.toLowerCase());
          const methodSizeMetric = metrics.find(m => 
            m.name === 'averageMethodSize' || m.name === 'averageMethodSizePython'
          );
          
          if (methodSizeMetric) {
            const result = methodSizeMetric.extract(document);
            if (result.methodBlocks && result.methodBlocks.length > 0) {
              this.highlightMethods(document, result.methodBlocks);
            } else {
              vscode.window.showInformationMessage('No se encontraron métodos en el código.');
            }
          }
        });
      }
    });

    this.loadProjectFiles().then(() => {
      this.update();
    });
  }

  private async loadProjectFiles() {
    await this.navigationManager.loadProjectFiles();
  }

  public update() {
    if (!this._view || !this.navigationManager.hasFiles) return;
    
    this.metricsRenderer.clearHighlights();

    const uri = this.navigationManager.currentFile!;
    vscode.workspace.openTextDocument(uri).then(document => {
      const fileName = uri.fsPath.split('/').pop() || 'Archivo';
      
      const languageInfo = LanguageDetector.detectLanguage(document);
      output.appendLine(`Detected language: ${languageInfo.name}`);
      
      this.currentLanguageInfo = languageInfo;
      
      const metrics = MetricFactory.getMetricsForLanguage(document.languageId.toLowerCase());
      
      this.csvManager = new MetricsCSVManager(metrics, output);
      const processedFilesCount = this.csvManager.getProcessedFilesCount();

      this.metricsRenderer.renderMetrics(
        document,
        metrics,
        this._view!,
        fileName,
        processedFilesCount,
        isLoading
      );
      
      setTimeout(() => {
        if (this._view) {
          output.appendLine(`Sending language info: ${languageInfo.name}, ${languageInfo.icon}, ${languageInfo.color}`);
          this._view.webview.postMessage({
            command: 'setLanguageInfo',
            name: languageInfo.name,
            icon: languageInfo.icon,
            color: languageInfo.color
          });
        }
      }, 100); 
    });
  }


  private openCsvFile() {
    const csvFilePath = this.getCsvFilePath();
    
    if (csvFilePath && fs.existsSync(csvFilePath)) {
      output.appendLine(`Opening CSV file: ${csvFilePath}`);
      
      vscode.workspace.openTextDocument(csvFilePath).then(doc => {
        vscode.window.showTextDocument(doc);
      }, (error: Error) => {
        output.appendLine(`Error opening CSV file: ${error}`);
        vscode.window.showErrorMessage(`Failed to open CSV file: ${error.message}`);
      });
    } else {
      output.appendLine('CSV file not found');
      vscode.window.showWarningMessage('CSV file not found or not yet created.');
    }
  }
  
  private getCsvFilePath(): string | null {

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const metricsDir = path.join(workspaceFolder.uri.fsPath, 'metrics-data');
      return path.join(metricsDir, 'metrics.csv');
    }
    return null;
  }

  public async navigateFile(direction: 'next' | 'prev') {
    if (!this.navigationManager.hasFiles) return;
    
    this.metricsRenderer.clearHighlights();

    this.navigationManager.setNeedsRefactoring(this.needsRefactoring);
    
    await this.navigationManager.navigateFile(direction);
    
    this.needsRefactoring = false;
    
    if (this._view) {
      this._view.webview.postMessage({ command: 'resetRefactoringCheckbox' });
    }
    
    this.update();
  }

  
  public openSettings() {
    output.appendLine('openSettings method called');
    
    if (!this._view) {
      output.appendLine('No view available');
      return;
    }
    
    output.appendLine('Sending openSettings message to webview');
    this._view.webview.postMessage({ command: 'openSettings' });
  }
  
  private sendSettings() {
    if (!this._view) return;
    
    const config = vscode.workspace.getConfiguration('lineCounter');
    const apiKey = config.get<string>('openai.apiKey') || '';
    const model = config.get<string>('openai.model') || 'gpt-3.5-turbo';
    
    this._view.webview.postMessage({
      command: 'setSettings',
      settings: {
        apiKey,
        model
      }
    });
    
    output.appendLine('Sent settings to webview');
  }
  
  private highlightDuplicatedCode(document: vscode.TextDocument, duplicatedBlocks: { startLine: number, endLine: number, blockId?: string }[]) {
    this.metricsRenderer.highlightDuplicatedCode(document, duplicatedBlocks);
  }
  
  private saveSettings(settings: { apiKey: string, model: string }) {
    const config = vscode.workspace.getConfiguration('lineCounter');
    config.update('openai.apiKey', settings.apiKey, true);
    config.update('openai.model', settings.model, true);
    
    output.appendLine('Saved settings to configuration');
    vscode.window.showInformationMessage('Configuración de OpenAI guardada correctamente');
  }
  
  private highlightMethods(document: vscode.TextDocument, methodBlocks: { startLine: number, endLine: number, size: number, name?: string }[]) {
    this.metricsRenderer.highlightMethods(document, methodBlocks);
  }
  
  private highlightLoops(document: vscode.TextDocument, loopBlocks: { startLine: number, endLine: number, loopType: string }[]) {
    this.metricsRenderer.highlightLoops(document, loopBlocks);
  }
  
}
