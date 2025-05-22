import { get } from 'http';
import * as vscode from 'vscode';
import { LineCountMetric } from './metrics/LineCountMetric';
import { IfCountMetric } from './metrics/IfCountMetric';
import { MetricExtractor } from './metrics/MetricExtractor';
import { UsingCountMetric } from './metrics/UsingCountMetric';
import { LoopCountMetric } from './metrics/LoopCountMetric';
import { LambdaCountMetric } from './metrics/LambdaCountMetric';
import { MethodCountMetric } from './metrics/MethodCountMetric';
import { AverageMethodSizeMetric } from './metrics/AverageMethodSizeMetric';
import { MethodCohesionMetric } from './metrics/MethodCohesionMetric';


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
  output.appendLine(`Ruta de extensión: ${context.extensionUri.fsPath}`);
  output.show();

  const provider = new LineCountViewProvider(context.extensionUri);

  output.appendLine(" Registrando proveedor de webview con ID: 'lineCounterView'");
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('lineCounterView', provider)
  );
  output.appendLine(" Proveedor de webview registrado");

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

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public get hasView(): boolean {
    return !!this._view;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    output.appendLine(" Método resolveWebviewView llamado");
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    output.appendLine(" Opciones de webview configuradas");
    this.update();
    output.appendLine(" Método update llamado");
  }

  public update() {
    if (!this._view) return;
  
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this._view.webview.html = this.getHtmlContent('No hay archivo activo', 'Archivo');
      return;
    }
  
    const document = editor.document;
    const fileName = document.fileName.split('/').pop() || 'Archivo';
  
    let content = '';
    for (const extractor of metricExtractors) {
      const result = extractor.extract(document);
      content += `<strong>${result.value}</strong> ${result.label}.<br/>`;
    }
  
    this._view.webview.html = this.getHtmlContent(content, fileName);
  }

  private getHtmlContent(content: string, title: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
        <body style="font-family: sans-serif; padding: 1em;">
          <h3 style="color: #007acc;">Analizando ${title} </h3>
          <p>${content}</p>
          <p style="color: #888;">Powered by ReFactorial !!</p>
        </body>
      </html>
    `;
  }
}
