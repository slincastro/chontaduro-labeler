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
import { MetricExtractor, MetricResult } from './metrics/MetricExtractor';

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

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.onDidReceiveMessage(message => {
      if (message.command === 'navigate') {
        this.navigateFile(message.direction);
      } else if (message.command === 'toggleRefactoring') {
        this.needsRefactoring = message.checked;
        output.appendLine(`Refactoring flag set to: ${this.needsRefactoring}`);
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

      let content = '';
      const metricResults: MetricResult[] = [];
      
      for (const extractor of metricExtractors) {
        const result = extractor.extract(document);
        metricResults.push(result);
        content += `<strong>${result.value}</strong> ${result.label}.<br/>`;
        
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

      this._view!.webview.html = this.getHtmlContent(content, fileName);
    });
  }


  private async navigateFile(direction: 'next' | 'prev') {
    if (this.csFiles.length === 0) return;
    
    // Clear decorations from current editor
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.setDecorations(this.maxDepthDecorationType, []);
    }

    // If direction is 'next', save metrics of the current file before navigating
    if (direction === 'next' && this.currentIndex >= 0 && this.currentIndex < this.csFiles.length) {
      const currentUri = this.csFiles[this.currentIndex];
      try {
        const currentDoc = await vscode.workspace.openTextDocument(currentUri);
        this.csvManager.saveMetricsToCSV(currentDoc, this.needsRefactoring);
        
        // Reset the refactoring flag after saving
        this.needsRefactoring = false;
        
        // Update the UI to reflect the reset checkbox
        if (this._view) {
          this._view.webview.postMessage({ command: 'resetRefactoringCheckbox' });
        }
      } catch (error) {
        output.appendLine(`Error saving metrics before navigation: ${error}`);
      }
    }

    // Update the index for navigation
    if (direction === 'next') {
      this.currentIndex = (this.currentIndex + 1) % this.csFiles.length;
    } else if (direction === 'prev') {
      this.currentIndex = (this.currentIndex - 1 + this.csFiles.length) % this.csFiles.length;
    }

    // Open the new file
    const uri = this.csFiles[this.currentIndex];
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
    this.update();
  }

  private getHtmlContent(content: string, title: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <body style="font-family: sans-serif; padding: 1em;">
        <div style="margin-top: 1em;">
          <button onclick="navigate('prev')">⏮️ Anterior</button>
          <button onclick="navigate('next')">⏭️ Siguiente</button>
        </div>

        <h3 style="color: #007acc;">Analizando ${title}</h3>
        <p>${content}</p>

        <div style="margin-top: 1em; display: flex; align-items: center;">
          <input type="checkbox" id="refactoringCheckbox" onchange="toggleRefactoring(this.checked)">
          <label for="refactoringCheckbox" style="margin-left: 0.5em;">Debe refactorizarse</label>
        </div>

        <p style="color: #888; margin-top: 2em;">Powered by ReFactorial !!</p>

        <script>
          const vscode = acquireVsCodeApi();
          
          function navigate(direction) {
            vscode.postMessage({ command: 'navigate', direction });
          }
          
          function toggleRefactoring(checked) {
            vscode.postMessage({ 
              command: 'toggleRefactoring', 
              checked: checked 
            });
          }
          
          // Listen for messages from the extension
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'resetRefactoringCheckbox') {
              document.getElementById('refactoringCheckbox').checked = false;
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}
