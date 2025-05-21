import * as vscode from 'vscode';

const output = vscode.window.createOutputChannel("LineCounter");
output.appendLine('🟢 Canal LineCounter iniciado');

export function activate(context: vscode.ExtensionContext) {
  output.appendLine("✅ Activando extensión LineCounter");
  output.appendLine(`📂 Ruta de extensión: ${context.extensionUri.fsPath}`);
  output.show();

  const provider = new LineCountViewProvider(context.extensionUri);

  output.appendLine("🔌 Registrando proveedor de webview con ID: 'lineCounterView'");
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('lineCounterView', provider)
  );
  output.appendLine("✅ Proveedor de webview registrado");

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
    output.appendLine("🪟 Método resolveWebviewView llamado");
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    output.appendLine("🔧 Opciones de webview configuradas");
    this.update();
    output.appendLine("🔄 Método update llamado");
  }

  public update() {
    if (!this._view) {
      return; 
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this._view.webview.html = this.getHtmlContent('No hay archivo activo');
      output.appendLine("📂 No hay editor activo");
      return;
    }

    const numLines = editor.document.lineCount;
    const fileName = editor.document.fileName.split('/').pop() || 'Archivo';

    output.appendLine(`📄 ${fileName} → ${numLines} líneas`);

    const content = `📄 <strong>${fileName}</strong> tiene <strong>${numLines}</strong> líneas.`;
    this._view.webview.html = this.getHtmlContent(content);
  }

  private getHtmlContent(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
        <body style="font-family: sans-serif; padding: 1em;">
          <h3 style="color: #007acc;">Contador de líneas </h3>
          <p>${content}</p>
          <p style="color: #888;">Es hora de labelear Andy Andy!!</p>
        </body>
      </html>
    `;
  }
}
