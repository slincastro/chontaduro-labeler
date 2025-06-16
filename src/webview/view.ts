import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

export class Webview {
  public getHtml(
    title: string,
    processedFilesCount: number,
    content: string,
    extensionUri: vscode.Uri,
    webview: vscode.Webview
  ): string {
    // 1) leer plantilla externa
    const templatePath = path.join(extensionUri.fsPath,'src' ,'media', 'template.html');
    const raw = fs.readFileSync(templatePath, 'utf8');

    // 2) compilar con Handlebars
    const template = handlebars.compile(raw);

    // 3) renderizar con datos dinámicos
    return template({
      title,
      processedFilesCount,
      content
    });
  }
}