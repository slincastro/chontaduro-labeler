import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Uri, StatusBarAlignment } from 'vscode';
import { MetricsCSVManager } from './csv/MetricsCSVManager';
import { Metric, MetricResult } from './metrics/Metric';
import { MetricFactory } from './metrics/MetricFactory';
import { LanguageDetector, LanguageInfo } from './language/LanguageDetector';
import { Webview } from './webview/view';

const output = vscode.window.createOutputChannel("LineCounter");
output.appendLine('Canal LineCounter iniciado');

let statusBarItem: vscode.StatusBarItem;
let isLoading = false;

MetricFactory.initializeRegistry();

export function activate(context: vscode.ExtensionContext) {
  output.appendLine("Activando extensión LineCounter");
  
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
  private csFiles: vscode.Uri[] = [];
  private currentIndex: number = 0;
  private csvManager: MetricsCSVManager;
  private needsRefactoring: boolean = false;
  private maxDepthDecorationType: vscode.TextEditorDecorationType;
  private duplicatedCodeDecorationType: vscode.TextEditorDecorationType;
  private duplicatedCodeDecorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();

  constructor(private readonly _extensionUri: vscode.Uri) {
    const defaultMetrics = MetricFactory.getCommonMetrics();
    this.csvManager = new MetricsCSVManager(defaultMetrics, output);
    
    this.maxDepthDecorationType = vscode.window.createTextEditorDecorationType({
      gutterIconPath: Uri.joinPath(this._extensionUri, 'media', 'icon-inverted.svg'),
      gutterIconSize: 'contain',
      overviewRulerColor: 'rgba(0, 122, 204, 0.7)',
      overviewRulerLane: vscode.OverviewRulerLane.Right
    });
    
    this.duplicatedCodeDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 165, 0, 0.2)',
      overviewRulerColor: 'rgba(255, 165, 0, 0.7)',
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
        this.update(); // Update the UI when OpenAI request is complete
      } else if (message.command === 'highlightDuplicatedCode') {
        // Get the current document
        const uri = this.csFiles[this.currentIndex];
        vscode.workspace.openTextDocument(uri).then(document => {
          // Extract the duplicated blocks from the CodeDuplicationMetricV2 metric
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
        // Get the current document
        const uri = this.csFiles[this.currentIndex];
        vscode.workspace.openTextDocument(uri).then(document => {
          // Extract the loop blocks from the LoopCountMetric
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
      }
    });

    this.loadProjectFiles().then(() => {
      this.update();
    });
  }

  private async loadProjectFiles() {
    const csFiles = await vscode.workspace.findFiles('**/*.cs', '**/node_modules/**');
    const pyFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**');
    
    this.csFiles = [...csFiles, ...pyFiles].sort((a, b) => a.fsPath.localeCompare(b.fsPath));
    
    const activeUri = vscode.window.activeTextEditor?.document.uri;
    this.currentIndex = this.csFiles.findIndex(uri => uri.toString() === activeUri?.toString());
    if (this.currentIndex === -1 && this.csFiles.length > 0) {
      this.currentIndex = 0;
    }
  }

  public update() {
    if (!this._view || this.csFiles.length === 0) return;
    
    const currentEditor = vscode.window.activeTextEditor;
    if (currentEditor) {
      currentEditor.setDecorations(this.maxDepthDecorationType, []);
    }

    const uri = this.csFiles[this.currentIndex];
    vscode.workspace.openTextDocument(uri).then(document => {
      const fileName = uri.fsPath.split('/').pop() || 'Archivo';
      
      const languageInfo = LanguageDetector.detectLanguage(document);
      output.appendLine(`Detected language: ${languageInfo.name}`);
      
      this.currentLanguageInfo = languageInfo;

      let content = '';
      const metricResults: MetricResult[] = [];
      
      const metrics = MetricFactory.getMetricsForLanguage(document.languageId.toLowerCase());

      for (const metric of metrics) {
        const result = metric.extract(document);
        metricResults.push(result);
        
        if (metric.name === 'nestingDepth' && result.lineNumber !== undefined) {
          const editor = vscode.window.activeTextEditor;
          if (editor && editor.document.uri.toString() === uri.toString()) {
            const position = new vscode.Position(result.lineNumber, 0);
            const selection = new vscode.Selection(position, position);
            editor.selection = selection;
            editor.revealRange(
              new vscode.Range(position, position),
              vscode.TextEditorRevealType.InCenter
            );
            
            const range = new vscode.Range(position, position);
            editor.setDecorations(this.maxDepthDecorationType, [range]);
          }
        }
      }
      
      // Separate AI-managed metrics from regular metrics
      const aiManagedMetrics = metricResults.filter(result => {
        const metric = metrics.find((m: Metric) => {
          const extractedResult = m.extract(document);
          return extractedResult.label === result.label;
        });
        return metric?.name === 'singleResponsibility';
      });
      
      // Regular metrics (non-AI managed)
      const regularMetrics = metricResults.filter(result => {
        const metric = metrics.find((m: Metric) => {
          const extractedResult = m.extract(document);
          return extractedResult.label === result.label;
        });
        return metric?.name !== 'singleResponsibility';
      });
      
      const nonZeroMetrics = regularMetrics.filter(result => result.value !== 0);
      nonZeroMetrics.sort((a, b) => b.value - a.value);
      
      const zeroMetrics = regularMetrics.filter(result => result.value === 0);
      
      content = '<div class="metrics-container">';
      
      // Add a button for LoopCountMetric at the top
      content += `
        <div style="margin-bottom: 15px; padding: 10px; background-color: #f0f7ff; border-radius: 4px; border-left: 3px solid #4169E1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Cantidad de bucles</strong>
            </div>
            <button onclick="highlightLoops()" style="background-color: #4169E1; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
              Mostrar bucles
            </button>
          </div>
        </div>
      `;
      
      // Regular metrics section
      if (nonZeroMetrics.length === 0) {
        content += '<p>No hay métricas con valores diferentes de cero.</p>';
      } else {
        for (const result of nonZeroMetrics) {
          // Find the corresponding metric
          const metric = metrics.find((m: Metric) => {
            const extractedResult = m.extract(document);
            output.appendLine(`Metric: ${m.name}, Label: ${extractedResult.label}, Result Label: ${result.label}`);
            
            // Check if the labels match or if this is the loopCount metric and the result label is "Cantidad de bucles"
            return extractedResult.label === result.label || 
                  (m.name === 'loopCount' && result.label === 'Cantidad de bucles');
          });
          
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
                <p>Esta métrica indica ${metric?.description || 'información sobre la calidad del código.'}</p>
                ${metric?.name === 'codeDuplicationV2' ? `
                <div style="margin-top: 15px;">
                  <button onclick="highlightDuplicatedCode()" style="background-color: #0078d7; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                    Mostrar código duplicado
                  </button>
                </div>
                ` : ''}
                ${metric?.name === 'loopCount' || result.label === 'Cantidad de bucles' ? `
                <div style="margin-top: 15px;">
                  <button onclick="highlightLoops()" style="background-color: #4169E1; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                    Mostrar bucles
                  </button>
                </div>
                ` : ''}
              </div>
            </div>
          `;
        }
      }
      
      // AI-managed metrics section
      content += `
        <div style="margin-top: 20px;">
          <h3 style="font-size: 1.1em; margin-bottom: 10px;">Métricas gestionadas por IA</h3>
          <div id="ai-metrics-container">
      `;
      
      if (aiManagedMetrics.length === 0) {
        content += '<p>No hay métricas gestionadas por IA disponibles.</p>';
      } else {
        for (const result of aiManagedMetrics) {
          const metric = metrics.find((m: Metric) => {
            const extractedResult = m.extract(document);
            return extractedResult.label === result.label;
          });
          
          const metricIsLoading = isLoading && metric?.name === 'singleResponsibility';
          
          if (metricIsLoading) {
            content += `
              <div class="ai-metric-loading">
                <div class="spinner">
                  <img src="${this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'spinner.svg'))}" alt="Loading..." width="24" height="24" />
                </div>
                <span>${result.label}</span>
              </div>
            `;
          } else {
            content += `
              <button class="collapsible ai-metric">
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
                  <p>Esta métrica indica ${metric?.description || 'información sobre la calidad del código.'}</p>
                </div>
              </div>
            `;
          }
        }
      }
      
      content += `
          </div>
        </div>
      `;
      
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
          content += `<li><strong>${result.label}</strong> - Esta métrica indica ${metrics.find((m: Metric) => {
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
      
      content += '<div style="display: none;">';
      content += '<table class="metrics-table">';
      content += '<thead><tr><th>Valor</th><th>Métrica</th></tr></thead>';
      content += '<tbody>';
      for (const result of metricResults) {
        content += `<tr><td><strong>${result.value}</strong></td><td>${result.label}</td></tr>`;
      }
      content += '</tbody></table>';
      content += '</div>';

      this.csvManager = new MetricsCSVManager(metrics, output);
      
      const processedFilesCount = this.csvManager.getProcessedFilesCount();

      this._view!.webview.html = this.getHtmlContent(content, fileName, processedFilesCount);
      
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
    if (this.csFiles.length === 0) return;
    
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.setDecorations(this.maxDepthDecorationType, []);
    }

    if (direction === 'next' && this.currentIndex >= 0 && this.currentIndex < this.csFiles.length) {
      const currentUri = this.csFiles[this.currentIndex];
      try {
        const currentDoc = await vscode.workspace.openTextDocument(currentUri);
        const metrics = MetricFactory.getMetricsForLanguage(currentDoc.languageId.toLowerCase());
        this.csvManager = new MetricsCSVManager(metrics, output);
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
    const webview = new Webview();
    
    if (!this._view) {
      return '';
    }
    
    let html = webview.getHtml(title, processedFilesCount, content, this._extensionUri, this._view.webview);
    
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
  
  private highlightDuplicatedCode(document: vscode.TextDocument, duplicatedBlocks: { startLine: number, endLine: number, blockId?: string }[]) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
      return;
    }
    
    // Clear any existing decorations
    editor.setDecorations(this.duplicatedCodeDecorationType, []);
    this.duplicatedCodeDecorationTypes.forEach(decorationType => {
      editor.setDecorations(decorationType, []);
    });
    
    // Define a set of colors for different block IDs
    const colors = [
      'rgba(255, 165, 0, 0.2)', // Orange
      'rgba(0, 128, 255, 0.2)',  // Blue
      'rgba(255, 0, 0, 0.2)',    // Red
      'rgba(0, 255, 0, 0.2)',    // Green
      'rgba(128, 0, 128, 0.2)',  // Purple
      'rgba(255, 192, 203, 0.2)', // Pink
      'rgba(0, 255, 255, 0.2)',  // Cyan
      'rgba(255, 255, 0, 0.2)'   // Yellow
    ];
    
    // Group blocks by blockId
    const blocksByBlockId = new Map<string, { startLine: number, endLine: number }[]>();
    const blocksWithoutId: { startLine: number, endLine: number }[] = [];
    
    for (const block of duplicatedBlocks) {
      if (block.blockId) {
        // Block has an ID, group it
        if (!blocksByBlockId.has(block.blockId)) {
          blocksByBlockId.set(block.blockId, []);
        }
        blocksByBlockId.get(block.blockId)?.push({
          startLine: block.startLine,
          endLine: block.endLine
        });
      } else {
        // Block doesn't have an ID, add to the list of blocks without ID
        blocksWithoutId.push({
          startLine: block.startLine,
          endLine: block.endLine
        });
      }
    }
    
    // Handle blocks without ID using the original decoration type
    if (blocksWithoutId.length > 0) {
      const ranges: vscode.Range[] = [];
      
      for (const block of blocksWithoutId) {
        const startPos = new vscode.Position(block.startLine, 0);
        const endPos = new vscode.Position(block.endLine, document.lineAt(block.endLine).text.length);
        ranges.push(new vscode.Range(startPos, endPos));
      }
      
      editor.setDecorations(this.duplicatedCodeDecorationType, ranges);
    }
    
    // Create and apply decorations for each blockId
    let colorIndex = 0;
    blocksByBlockId.forEach((blocks, blockId) => {
      // Create a decoration type for this blockId if it doesn't exist
      if (!this.duplicatedCodeDecorationTypes.has(blockId)) {
        const color = colors[colorIndex % colors.length];
        const rulerColor = color.replace('0.2', '0.7');
        
        this.duplicatedCodeDecorationTypes.set(blockId, vscode.window.createTextEditorDecorationType({
          backgroundColor: color,
          overviewRulerColor: rulerColor,
          overviewRulerLane: vscode.OverviewRulerLane.Right,
          before: {
            contentText: `${blockId} `,
            color: 'white',
            backgroundColor: rulerColor,
            margin: '0 5px 0 0',
            border: '1px solid black'
          }
        }));
        
        colorIndex++;
      }
      
      // Create ranges for all blocks with this blockId
      const ranges: vscode.Range[] = [];
      
      for (const block of blocks) {
        const startPos = new vscode.Position(block.startLine, 0);
        const endPos = new vscode.Position(block.endLine, document.lineAt(block.endLine).text.length);
        ranges.push(new vscode.Range(startPos, endPos));
      }
      
      // Apply the decorations
      const decorationType = this.duplicatedCodeDecorationTypes.get(blockId);
      if (decorationType) {
        editor.setDecorations(decorationType, ranges);
      }
    });
    
    // Scroll to the first duplicated block if there is one
    if (duplicatedBlocks.length > 0) {
      const firstBlock = duplicatedBlocks[0];
      const startPos = new vscode.Position(firstBlock.startLine, 0);
      const endPos = new vscode.Position(firstBlock.endLine, document.lineAt(firstBlock.endLine).text.length);
      
      editor.revealRange(
        new vscode.Range(startPos, endPos),
        vscode.TextEditorRevealType.InCenter
      );
    }
  }
  
  private saveSettings(settings: { apiKey: string, model: string }) {
    const config = vscode.workspace.getConfiguration('lineCounter');
    config.update('openai.apiKey', settings.apiKey, true);
    config.update('openai.model', settings.model, true);
    
    output.appendLine('Saved settings to configuration');
    vscode.window.showInformationMessage('Configuración de OpenAI guardada correctamente');
  }
  
  private highlightLoops(document: vscode.TextDocument, loopBlocks: { startLine: number, endLine: number, loopType: string }[]) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
      return;
    }
    
    // Create a decoration type for loops
    const loopDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(65, 105, 225, 0.2)', // Royal blue with transparency
      overviewRulerColor: 'rgba(65, 105, 225, 0.7)',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      before: {
        contentText: '⟳ ', // Loop symbol
        color: '#4169E1',
        margin: '0 5px 0 0'
      }
    });
    
    // Create ranges for all loop blocks
    const ranges: vscode.Range[] = [];
    
    for (const block of loopBlocks) {
      const startPos = new vscode.Position(block.startLine, 0);
      // For the end position, use the end of the line
      const endPos = new vscode.Position(block.startLine, document.lineAt(block.startLine).text.length);
      ranges.push(new vscode.Range(startPos, endPos));
    }
    
    // Apply the decorations
    editor.setDecorations(loopDecorationType, ranges);
    
    // Scroll to the first loop if there is one
    if (loopBlocks.length > 0) {
      const firstBlock = loopBlocks[0];
      const startPos = new vscode.Position(firstBlock.startLine, 0);
      const endPos = new vscode.Position(firstBlock.startLine, document.lineAt(firstBlock.startLine).text.length);
      
      editor.revealRange(
        new vscode.Range(startPos, endPos),
        vscode.TextEditorRevealType.InCenter
      );
    }
  }
  
}
