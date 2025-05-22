import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { LineCountMetric } from './metrics/LineCountMetric';
import { IfCountMetric } from './metrics/IfCountMetric';
import { UsingCountMetric } from './metrics/UsingCountMetric';
import { LoopCountMetric } from './metrics/LoopCountMetric';
import { LambdaCountMetric } from './metrics/LambdaCountMetric';
import { MethodCountMetric } from './metrics/MethodCountMetric';
import { AverageMethodSizeMetric } from './metrics/AverageMethodSizeMetric';
import { MethodCohesionMetric } from './metrics/MethodCohesionMetric';
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
];

export function activate(context: vscode.ExtensionContext) {
  output.appendLine("Activando extensión LineCounter");
  
  // Ensure metrics directory exists
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const metricsDir = path.join(workspaceFolder.uri.fsPath, 'metrics-data');
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
      output.appendLine(`Created metrics directory: ${metricsDir}`);
    }
  }
  
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
  private csvFilePath: string | null = null;

  constructor(private readonly _extensionUri: vscode.Uri) {
    // Initialize CSV file path
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const metricsDir = path.join(workspaceFolder.uri.fsPath, 'metrics-data');
      this.csvFilePath = path.join(metricsDir, 'metrics.csv');
      
      // Create CSV header if file doesn't exist
      if (!fs.existsSync(this.csvFilePath)) {
        const header = ['UUID', 'Timestamp', 'Filename', 'FilePath'];
        
        // Add metric names to header
        metricExtractors.forEach(extractor => {
          header.push(extractor.name);
        });
        
        fs.writeFileSync(this.csvFilePath, header.join(',') + '\n');
        output.appendLine(`Created metrics CSV file: ${this.csvFilePath}`);
      }
    }
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

    const uri = this.csFiles[this.currentIndex];
    vscode.workspace.openTextDocument(uri).then(document => {
      const fileName = uri.fsPath.split('/').pop() || 'Archivo';

      let content = '';
      const metricResults: MetricResult[] = [];
      
      for (const extractor of metricExtractors) {
        const result = extractor.extract(document);
        metricResults.push(result);
        content += `<strong>${result.value}</strong> ${result.label}.<br/>`;
      }

      this._view!.webview.html = this.getHtmlContent(content, fileName);
    });
  }

  /**
   * Saves the current file's metrics to the CSV file
   * @param document The document to extract metrics from
   */
  private saveMetricsToCSV(document: vscode.TextDocument): void {
    if (!this.csvFilePath) return;

    try {
      const uuid = uuidv4();
      const timestamp = new Date().toISOString();
      const fileName = document.uri.fsPath.split('/').pop() || 'Unknown';
      const filePath = document.uri.fsPath;
      
      // Extract all metrics
      const metricValues: number[] = [];
      for (const extractor of metricExtractors) {
        const result = extractor.extract(document);
        metricValues.push(result.value);
      }
      
      // Create CSV row
      const row = [
        uuid,
        timestamp,
        this.escapeCsvValue(fileName),
        this.escapeCsvValue(filePath),
        ...metricValues
      ];
      
      // Append to CSV file
      fs.appendFileSync(this.csvFilePath, row.join(',') + '\n');
      output.appendLine(`Metrics saved to CSV for file: ${fileName}`);
    } catch (error) {
      output.appendLine(`Error saving metrics to CSV: ${error}`);
    }
  }
  
  /**
   * Escapes a value for CSV format
   * @param value The value to escape
   * @returns The escaped value
   */
  private escapeCsvValue(value: string): string {
    // If the value contains commas, quotes, or newlines, wrap it in quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // Double up any quotes
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private async navigateFile(direction: 'next' | 'prev') {
    if (this.csFiles.length === 0) return;

    // If direction is 'next', save metrics of the current file before navigating
    if (direction === 'next' && this.currentIndex >= 0 && this.currentIndex < this.csFiles.length) {
      const currentUri = this.csFiles[this.currentIndex];
      try {
        const currentDoc = await vscode.workspace.openTextDocument(currentUri);
        this.saveMetricsToCSV(currentDoc);
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
        <h3 style="color: #007acc;">Analizando ${title}</h3>
        <p>${content}</p>

        <div style="margin-top: 1em;">
          <button onclick="navigate('prev')">⏮️ Anterior</button>
          <button onclick="navigate('next')">⏭️ Siguiente</button>
        </div>

        <p style="color: #888; margin-top: 2em;">Powered by ReFactorial !!</p>

        <script>
          const vscode = acquireVsCodeApi();
          function navigate(direction) {
            vscode.postMessage({ command: 'navigate', direction });
          }
        </script>
      </body>
      </html>
    `;
  }
}
