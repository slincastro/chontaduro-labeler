import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Uri, StatusBarAlignment } from 'vscode';
import { MetricsCSVManager } from './csv/MetricsCSVManager';
import { Metric, MetricResult } from './metrics/Metric';
import { MetricFactory } from './metrics/MetricFactory';
import { LanguageDetector, LanguageInfo } from './language/LanguageDetector';
import { Webview } from './webview/view';
import { HighlightManager } from './highlight/HighlightManager';
import { NavigationManager } from './navigation/NavigationManager';

const output = vscode.window.createOutputChannel("LineCounter");
output.appendLine('Canal LineCounter iniciado');

let statusBarItem: vscode.StatusBarItem;
let isLoading = false;

MetricFactory.initializeRegistry();

export function activate(context: vscode.ExtensionContext) {
  output.appendLine("Activando extensión chontaduro");
  
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
  private navigationManager: NavigationManager;
  private csvManager: MetricsCSVManager;
  private needsRefactoring: boolean = false;
  private highlightManager: HighlightManager;

  constructor(private readonly _extensionUri: vscode.Uri) {
    const defaultMetrics = MetricFactory.getCommonMetrics();
    this.navigationManager = new NavigationManager(this._extensionUri, output);
    this.csvManager = new MetricsCSVManager(defaultMetrics, output);
    this.highlightManager = new HighlightManager(this._extensionUri);
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
        this.update(); 
      } else if (message.command === 'highlightDuplicatedCode') {
        if (!this.navigationManager.currentFile) return;
        
        const uri = this.navigationManager.currentFile;
        vscode.workspace.openTextDocument(uri).then(document => {
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
        if (!this.navigationManager.currentFile) return;
        
        // Get the current document
        const uri = this.navigationManager.currentFile;
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
      } else if (message.command === 'highlightMethods') {
        if (!this.navigationManager.currentFile) return;
        
        // Get the current document
        const uri = this.navigationManager.currentFile;
        vscode.workspace.openTextDocument(uri).then(document => {
          // Extract the method blocks from the AverageMethodSizeMetric
          const metrics = MetricFactory.getMetricsForLanguage(document.languageId.toLowerCase());
          const methodSizeMetric = metrics.find(m => 
            m.name === 'averageMethodSize' || m.name === 'averageMethodSizePython'
          );
          
          if (methodSizeMetric) {
            const result = methodSizeMetric.extract(document);
            if (result.methodBlocks && result.methodBlocks.length > 0) {
              this.highlightMethods(document, result.methodBlocks);
            } else {
              vscode.window.showInformationMessage('No se encontraron métodos en el código.');
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
    await this.navigationManager.loadProjectFiles();
  }

  public update() {
    if (!this._view || !this.navigationManager.hasFiles) return;
    
    // Explicitly clear method highlights before updating
    this.highlightManager.clearMethodHighlights();
    this.highlightManager.clearAllHighlights();

    const uri = this.navigationManager.currentFile!;
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
          this.highlightManager.highlightMaxDepth(document, result.lineNumber);
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
            const isMatch = extractedResult.label === result.label || 
                  (m.name === 'loopCount' && result.label === 'Cantidad de bucles');
            
            if (isMatch) {
              output.appendLine(`Found matching metric: ${m.name}`);
            }
            
            return isMatch;
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
                <p>Name : ${metric?.name}</p>
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
                ${metric?.name === 'averageMethodSizePython' || result.label === 'Tamaño promedio de métodos (Python)' ? `
                <div style="margin-top: 15px;">
                  <button onclick="highlightMethods()" style="background-color: #9932CC; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                    Mostrar métodos
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
    if (!this.navigationManager.hasFiles) return;
    
    // Explicitly clear method highlights before navigating
    this.highlightManager.clearMethodHighlights();
    this.highlightManager.clearAllHighlights();

    // Set the refactoring flag in the navigation manager
    this.navigationManager.setNeedsRefactoring(this.needsRefactoring);
    
    // Navigate to the next/previous file
    await this.navigationManager.navigateFile(direction);
    
    // Reset the refactoring flag
    this.needsRefactoring = false;
    
    if (this._view) {
      this._view.webview.postMessage({ command: 'resetRefactoringCheckbox' });
    }
    
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
    this.highlightManager.highlightDuplicatedCode(document, duplicatedBlocks);
  }
  
  private saveSettings(settings: { apiKey: string, model: string }) {
    const config = vscode.workspace.getConfiguration('lineCounter');
    config.update('openai.apiKey', settings.apiKey, true);
    config.update('openai.model', settings.model, true);
    
    output.appendLine('Saved settings to configuration');
    vscode.window.showInformationMessage('Configuración de OpenAI guardada correctamente');
  }
  
  private highlightMethods(document: vscode.TextDocument, methodBlocks: { startLine: number, endLine: number, size: number, name?: string }[]) {
    this.highlightManager.highlightMethods(document, methodBlocks);
  }
  
  private highlightLoops(document: vscode.TextDocument, loopBlocks: { startLine: number, endLine: number, loopType: string }[]) {
    this.highlightManager.highlightLoops(document, loopBlocks);
  }
  
}
