import * as vscode from 'vscode';
import { LineCountMetric } from './metrics/LineCountMetric';
import { IfCountMetric } from './metrics/IfCountMetric';
import { UsingCountMetric } from './metrics/UsingCountMetric';
import { LoopCountMetric } from './metrics/LoopCountMetric';
import { LambdaCountMetric } from './metrics/LambdaCountMetric';
import { MethodCountMetric } from './metrics/MethodCountMetric';
import { AverageMethodSizeMetric } from './metrics/AverageMethodSizeMetric';
import { MethodCohesionMetric } from './metrics/MethodCohesionMetric';
import { MetricExtractor } from './metrics/MetricExtractor';

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

  constructor(private readonly _extensionUri: vscode.Uri) {}

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
      for (const extractor of metricExtractors) {
        const result = extractor.extract(document);
        content += `<strong>${result.value}</strong> ${result.label}.<br/>`;
      }

      this._view!.webview.html = this.getHtmlContent(content, fileName);
    });
  }

  private async navigateFile(direction: 'next' | 'prev') {
    if (this.csFiles.length === 0) return;

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