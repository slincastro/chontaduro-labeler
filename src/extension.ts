import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Uri, StatusBarAlignment } from 'vscode';
import { MetricsCSVManager } from './csv/MetricsCSVManager';
import { LineCountMetric } from './metrics/LineCountMetric';
import { IfCountMetric } from './metrics/IfCountMetric';
import { UsingCountMetric } from './metrics/UsingCountMetric';
import { LoopCountMetric } from './metrics/LoopCountMetric';
import { LambdaCountMetric } from './metrics/LambdaCountMetric';
import { MethodCountMetric } from './metrics/MethodCountMetric';
import { ClassCountMetric } from './metrics/ClassCountMetric';
import { AverageMethodSizeMetric } from './metrics/AverageMethodSizeMetric';
import { MethodCohesionMetric } from './metrics/MethodCohesionMetric';
import { NestingDepthMetric } from './metrics/NestingDepthMetric';
import { CommentLineCountMetric } from './metrics/CommentLineCountMetric';
import { CommentRatioMetric } from './metrics/CommentRatioMetric';
import { CodeDuplicationMetric } from './metrics/CodeDuplicationMetric';
import { GetterSetterCountMetric } from './metrics/GetterSetterCountMetric';
import { ObjectTypeMetric } from './metrics/ObjectTypeMetric';
import { MetricExtractor, MetricResult } from './metrics/MetricExtractor';
import { LanguageDetector, LanguageInfo } from './language/LanguageDetector';
import { Webview } from './webview/view';
import { ConstructorCountMetric } from './metrics/ConstructorCountMetric';
import { InterfaceConstructorParameterCountMetric } from './metrics/InterfaceConstructorParameterCountMetric';
import { SingleResponsibilityMetric } from './metrics/SingleResponsibilityMetric';

const output = vscode.window.createOutputChannel("LineCounter");
output.appendLine('Canal LineCounter iniciado');

// Status bar item
let statusBarItem: vscode.StatusBarItem;
let isLoading = false;

const metricExtractors: MetricExtractor[] = [
  LineCountMetric,
  IfCountMetric,
  UsingCountMetric,
  LoopCountMetric,
  LambdaCountMetric,
  MethodCountMetric,
  ClassCountMetric,
  AverageMethodSizeMetric,
  MethodCohesionMetric,
  NestingDepthMetric,
  CommentLineCountMetric,
  CommentRatioMetric,
  CodeDuplicationMetric,
  GetterSetterCountMetric,
  ObjectTypeMetric,
  ConstructorCountMetric,
  InterfaceConstructorParameterCountMetric,
  SingleResponsibilityMetric
];

export function activate(context: vscode.ExtensionContext) {
  output.appendLine("Activando extensión LineCounter");
  
  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(symbol-misc)";
  statusBarItem.tooltip = "Chontaduro Labeler";
  statusBarItem.command = 'lineCounterView.focus';
  context.subscriptions.push(statusBarItem);
  statusBarItem.show();

  // Set the status bar item icon using a built-in VS Code icon
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
    
    // Register a command to open settings
  context.subscriptions.push(
    vscode.commands.registerCommand('lineCounterView.openSettings', () => {
      if (provider.hasView) {
        provider.openSettings();
      }
    })
  );
  
  // Register commands to show/hide loading spinner
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

  // Register commands for navigation
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
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}

// Function to start loading animation
export function startLoading() {
  if (isLoading) {
    return;
  }
  
  isLoading = true;
  statusBarItem.text = "$(sync~spin)";
}

// Function to stop loading animation
export function stopLoading() {
  isLoading = false;
  statusBarItem.text = "$(symbol-misc)";
}


class LineCountViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private csFiles: vscode.Uri[] = [];
  private currentIndex: number = 0;
  private csvManager: MetricsCSVManager;
  private needsRefactoring: boolean = false;
  private maxDepthDecorationType: vscode.TextEditorDecorationType;

  constructor(private readonly _extensionUri: vscode.Uri) {
    // Initialize CSV manager
    this.csvManager = new MetricsCSVManager(metricExtractors, output);
    
    // Create decoration type for max depth line
    this.maxDepthDecorationType = vscode.window.createTextEditorDecorationType({
      gutterIconPath: Uri.joinPath(this._extensionUri, 'media', 'icon-inverted.svg'),
      gutterIconSize: 'contain',
      overviewRulerColor: 'rgba(0, 122, 204, 0.7)',
      overviewRulerLane: vscode.OverviewRulerLane.Right
    });
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
        output.appendLine(`Refactoring flag set to: ${this.needsRefactoring}`);
      } else if (message.command === 'webviewReady') {
        output.appendLine('Webview is ready');
        
        // If we have language info stored, send it now
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
      }
    });

    this.loadProjectFiles().then(() => {
      this.update();
    });
  }

  private async loadProjectFiles() {
    const files = await vscode.workspace.findFiles('**/*.cs', '**/node_modules/**');
    this.csFiles = files.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
    const activeUri = vscode.window.activeTextEditor?.document.uri;
    this.currentIndex = this.csFiles.findIndex(uri => uri.toString() === activeUri?.toString());
    if (this.currentIndex === -1 && this.csFiles.length > 0) {
      this.currentIndex = 0;
    }
  }

  public update() {
    if (!this._view || this.csFiles.length === 0) return;
    
    // Clear decorations from current editor
    const currentEditor = vscode.window.activeTextEditor;
    if (currentEditor) {
      currentEditor.setDecorations(this.maxDepthDecorationType, []);
    }

    const uri = this.csFiles[this.currentIndex];
    vscode.workspace.openTextDocument(uri).then(document => {
      const fileName = uri.fsPath.split('/').pop() || 'Archivo';
      
      // Detect language
      const languageInfo = LanguageDetector.detectLanguage(document);
      output.appendLine(`Detected language: ${languageInfo.name}`);
      
      // Store the current language info
      this.currentLanguageInfo = languageInfo;

      let content = '';
      const metricResults: MetricResult[] = [];
      
      // Extract all metrics first
      for (const extractor of metricExtractors) {
        const result = extractor.extract(document);
        metricResults.push(result);
        
        // If this is the nesting depth metric and it has a lineNumber, select that line and add decoration
        if (extractor.name === 'nestingDepth' && result.lineNumber !== undefined) {
          const editor = vscode.window.activeTextEditor;
          if (editor && editor.document.uri.toString() === uri.toString()) {
            const position = new vscode.Position(result.lineNumber, 0);
            const selection = new vscode.Selection(position, position);
            editor.selection = selection;
            editor.revealRange(
              new vscode.Range(position, position),
              vscode.TextEditorRevealType.InCenter
            );
            
            // Clear previous decorations and apply new one
            const range = new vscode.Range(position, position);
            editor.setDecorations(this.maxDepthDecorationType, [range]);
          }
        }
      }
      
      // Filter out metrics with value 0 and sort from highest to lowest value
      const nonZeroMetrics = metricResults.filter(result => result.value !== 0);
      nonZeroMetrics.sort((a, b) => b.value - a.value);
      
      // Get metrics with value 0
      const zeroMetrics = metricResults.filter(result => result.value === 0);
      
      // Generate content with collapsible sections for non-zero metrics
      content = '<div class="metrics-container">';
      
      if (nonZeroMetrics.length === 0) {
        content += '<p>No hay métricas con valores diferentes de cero.</p>';
      } else {
        for (const result of nonZeroMetrics) {
          // Create a collapsible button for each metric
          content += `
            <button class="collapsible">
              <div>
                <span class="metric-value">${result.value}</span>
                ${result.label}
              </div>
              <span class="collapsible-dots">...</span>
            </button>
            <div class="collapsible-content">
              <div style="padding: 15px;">
                <p><strong>Detalles:</strong></p>
                <p>Valor: ${result.value}</p>
                <p>Métrica: ${result.label}</p>
                ${result.lineNumber !== undefined ? `<p>Línea: ${result.lineNumber + 1}</p>` : ''}
                <p>Esta métrica indica ${metricExtractors.find(m => {
                  const extractedResult = m.extract(document);
                  return extractedResult.label === result.label;
                })?.description || 'información sobre la calidad del código.'}</p>
              </div>
            </div>
          `;
        }
      }
      
      // Add a collapsible section for metrics with value 0
      content += `
        <div style="margin-top: 20px;">
          <button class="collapsible" style="background-color: #f8f9fa;">
            <div>
              <span style="font-weight: bold;">Métricas con valor 0</span>
            </div>
            <span class="collapsible-dots">...</span>
          </button>
          <div class="collapsible-content">
            <div style="padding: 15px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
      `;
      
      if (zeroMetrics.length === 0) {
        content += '<p>No hay métricas con valor 0.</p>';
      } else {
        content += '<ul style="padding-left: 20px; margin-top: 10px;">';
        for (const result of zeroMetrics) {
          content += `<li><strong>${result.label}</strong> - Esta métrica indica ${metricExtractors.find(m => {
            const extractedResult = m.extract(document);
            return extractedResult.label === result.label;
          })?.description || 'información sobre la calidad del código.'}</li>`;
        }
        content += '</ul>';
      }
      
      content += `
            </div>
          </div>
        </div>
      </div>
      `;
      
      // Add a hidden table with all metrics for CSV export
      content += '<div style="display: none;">';
      content += '<table class="metrics-table">';
      content += '<thead><tr><th>Valor</th><th>Métrica</th></tr></thead>';
      content += '<tbody>';
      for (const result of metricResults) {
        content += `<tr><td><strong>${result.value}</strong></td><td>${result.label}</td></tr>`;
      }
      content += '</tbody></table>';
      content += '</div>';

      // Get the number of processed files
      const processedFilesCount = this.csvManager.getProcessedFilesCount();

      // Set the HTML content
      this._view!.webview.html = this.getHtmlContent(content, fileName, processedFilesCount);
      
      // Send language information to the webview after a small delay to ensure the webview is ready
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
      }, 100); // 100ms delay
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
    if (this.csFiles.length === 0) return;
    
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.setDecorations(this.maxDepthDecorationType, []);
    }

    if (direction === 'next' && this.currentIndex >= 0 && this.currentIndex < this.csFiles.length) {
      const currentUri = this.csFiles[this.currentIndex];
      try {
        const currentDoc = await vscode.workspace.openTextDocument(currentUri);
        this.csvManager.saveMetricsToCSV(currentDoc, this.needsRefactoring);
        
        this.needsRefactoring = false;
        
        if (this._view) {
          this._view.webview.postMessage({ command: 'resetRefactoringCheckbox' });
        }
      } catch (error) {
        output.appendLine(`Error saving metrics before navigation: ${error}`);
      }
    }

    if (direction === 'next') {
      this.currentIndex = (this.currentIndex + 1) % this.csFiles.length;
    } else if (direction === 'prev') {
      this.currentIndex = (this.currentIndex - 1 + this.csFiles.length) % this.csFiles.length;
    }

    const uri = this.csFiles[this.currentIndex];
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
    this.update();
  }

  private getHtmlContent(content: string, title: string, processedFilesCount: number = 0): string {
    //const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'lineCountView.html');
    //let html = fs.readFileSync(htmlPath, 'utf8');
    const webview = new Webview();
    
    // Make sure we have a view before trying to get the webview
    if (!this._view) {
      return '';
    }
    
    let html = webview.getHtml(title, processedFilesCount, content, this._extensionUri, this._view.webview);

    //html = html.replace('${title}', title);
    //html = html.replace('${processedFilesCount}', processedFilesCount.toString());
    //html = html.replace('${content}', content);
    
    return html;
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
  
  private saveSettings(settings: { apiKey: string, model: string }) {
    const config = vscode.workspace.getConfiguration('lineCounter');
    config.update('openai.apiKey', settings.apiKey, true);
    config.update('openai.model', settings.model, true);
    
    output.appendLine('Saved settings to configuration');
    vscode.window.showInformationMessage('Configuración de OpenAI guardada correctamente');
  }
  
}
