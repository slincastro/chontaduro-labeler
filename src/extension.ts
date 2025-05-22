import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Uri } from 'vscode';
import { MetricsCSVManager } from './csv/MetricsCSVManager';
import { LineCountMetric } from './metrics/LineCountMetric';
import { IfCountMetric } from './metrics/IfCountMetric';
import { UsingCountMetric } from './metrics/UsingCountMetric';
import { LoopCountMetric } from './metrics/LoopCountMetric';
import { LambdaCountMetric } from './metrics/LambdaCountMetric';
import { MethodCountMetric } from './metrics/MethodCountMetric';
import { AverageMethodSizeMetric } from './metrics/AverageMethodSizeMetric';
import { MethodCohesionMetric } from './metrics/MethodCohesionMetric';
import { NestingDepthMetric } from './metrics/NestingDepthMetric';
import { CommentLineCountMetric } from './metrics/CommentLineCountMetric';
import { CommentRatioMetric } from './metrics/CommentRatioMetric';
import { CodeDuplicationMetric } from './metrics/CodeDuplicationMetric';
import { MetricExtractor, MetricResult } from './metrics/MetricExtractor';
import { LanguageDetector, LanguageInfo } from './language/LanguageDetector';

const output = vscode.window.createOutputChannel("LineCounter");
output.appendLine('Canal LineCounter iniciado');

const metricExtractors: MetricExtractor[] = [
  LineCountMetric,
  IfCountMetric,
  UsingCountMetric,
  LoopCountMetric,
  LambdaCountMetric,
  MethodCountMetric,
  AverageMethodSizeMetric,
  MethodCohesionMetric,
  NestingDepthMetric,
  CommentLineCountMetric,
  CommentRatioMetric,
  CodeDuplicationMetric,
];

export function activate(context: vscode.ExtensionContext) {
  output.appendLine("Activando extensión LineCounter");
  
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
}

export function deactivate() {}

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
      
      // Sort metrics from highest to lowest value
      metricResults.sort((a, b) => b.value - a.value);
      
      // Generate content with sorted metrics
      for (const result of metricResults) {
        content += `<strong>${result.value}</strong> ${result.label}.<br/>`;
      }

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


  private async navigateFile(direction: 'next' | 'prev') {
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
    // Read the HTML template file
    const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'lineCountView.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Replace placeholders with dynamic content
    html = html.replace('${title}', title);
    html = html.replace('${processedFilesCount}', processedFilesCount.toString());
    html = html.replace('${content}', content);
    
    return html;
  }
}
