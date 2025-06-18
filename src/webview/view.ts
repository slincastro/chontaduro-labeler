import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

export class Webview {

  private nonce(): string { return [...Array(16)].map(()=>Math.random().toString(36)[2]).join(''); }

  public getHtml(
    title: string,
    processedFilesCount: number,
    content: string,
    extensionUri: vscode.Uri,
    webview: vscode.Webview
  ): string {
    const templatePath = path.join(extensionUri.fsPath,'media', 'template.html');
    const raw = fs.readFileSync(templatePath, 'utf8');

    const template = handlebars.compile(raw);

    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri,'media','styles.css')).toString();
    const jsUri  = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri,'media','webview.js')).toString();

    return template({
      title,
      processedFilesCount,
      content,
      cssUri,
      jsUri,
      nonce: this.nonce()
    });
  }
}