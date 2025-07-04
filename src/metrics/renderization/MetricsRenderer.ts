import * as vscode from 'vscode';
import { Metric, MetricResult } from '../Metric';
import { HighlightManager } from '../../highlight/HighlightManager';
import { Webview } from '../../webview/view';

export class MetricsRenderer {
    private highlightManager: HighlightManager;
    private output: vscode.OutputChannel;

    constructor(
        private readonly extensionUri: vscode.Uri,
        output: vscode.OutputChannel
    ) {
        this.highlightManager = new HighlightManager(this.extensionUri);
        this.output = output;
    }

    public renderMetrics(
        document: vscode.TextDocument,
        metrics: Metric[],
        webview: vscode.WebviewView,
        fileName: string,
        processedFilesCount: number,
        isLoading: boolean
    ): void {
        const metricResults: MetricResult[] = [];
        
        for (const metric of metrics) {
            const result = metric.extract(document);
            metricResults.push(result);
            
            if (metric.name === 'nestingDepth' && result.lineNumber !== undefined) {
                this.highlightManager.highlightMaxDepth(document, result.lineNumber);
            }
        }
        
        const aiManagedMetrics = metricResults.filter(result => {
            const metric = metrics.find((m: Metric) => {
                const extractedResult = m.extract(document);
                return extractedResult.label === result.label;
            });
            return metric?.name === 'singleResponsibility';
        });
        
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
        
        let content = '<div class="metrics-container">';
        
        
        if (nonZeroMetrics.length === 0) {
            content += '<p>No hay métricas con valores diferentes de cero.</p>';
        } else {
            for (const result of nonZeroMetrics) {
                
                const metric = metrics.find((m: Metric) => {
                    const extractedResult = m.extract(document);
                    this.output.appendLine(`Metric: ${m.name}, Label: ${extractedResult.label}, Result Label: ${result.label}`);
                    
                    const isMatch = extractedResult.label === result.label || 
                        (m.name === 'loopCount' && result.label === 'Cantidad de bucles');
                    
                    if (isMatch) {
                        this.output.appendLine(`Found matching metric: ${m.name}`);
                    }
                    
                    return isMatch;
                });
                
                content += `


    <button class="collapsible" style="display: flex; align-items: center; gap: 8px; flex-grow: 1;">
      <span class="metric-value">${result.value}</span>
      <span>${result.label}</span>
      <span class="collapsible-dots">...</span>
      

    </button>


                    <div class="collapsible-content">
                    <div style="padding: 15px;">
                        <p><strong>Detalles:</strong></p>
                        <p>          ${metric?.hasAction ? `
      <button onclick="${metric?.action?.method}()" style="background: none; border: none; cursor: pointer; padding: 0; margin: 0;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#4169E1" viewBox="0 0 16 16">
          <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zm-8 4a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
          <path d="M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
        </svg>
      </button>
    ` :`` }</p>
                        <p>Valor: ${result.value}</p>
                        <p>Métrica: ${result.label}</p>
                        ${result.lineNumber !== undefined ? `<p>Línea: ${result.lineNumber + 1}</p>` : ''}
                        <p>Name : ${metric?.name}</p>
                        <p>Esta métrica indica ${metric?.description || 'información sobre la calidad del código.'}</p>

                    </div>
                    </div>
                `;
            }
        }
        
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
                        <img src="${webview.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'spinner.svg'))}" alt="Loading..." width="24" height="24" />
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

        webview.webview.html = this.getHtmlContent(content, fileName, processedFilesCount, webview.webview);
    }

    private getHtmlContent(content: string, title: string, processedFilesCount: number = 0, webview: vscode.Webview): string {
        const webviewHelper = new Webview();
        return webviewHelper.getHtml(title, processedFilesCount, content, this.extensionUri, webview);
    }

    public highlightDuplicatedCode(document: vscode.TextDocument, duplicatedBlocks: { startLine: number, endLine: number, blockId?: string }[]): void {
        this.highlightManager.highlightDuplicatedCode(document, duplicatedBlocks);
    }
    
    public highlightMethods(document: vscode.TextDocument, methodBlocks: { startLine: number, endLine: number, size: number, name?: string }[]): void {
        this.highlightManager.highlightMethods(document, methodBlocks);
    }
    
    public highlightLoops(document: vscode.TextDocument, loopBlocks: { startLine: number, endLine: number, loopType: string }[]): void {
        this.highlightManager.highlightLoops(document, loopBlocks);
    }
    
    public highlightConstructors(document: vscode.TextDocument, constructorBlocks: { startLine: number, endLine: number, name?: string }[]): void {
        this.highlightManager.highlightConstructors(document, constructorBlocks);
    }

    public clearHighlights(): void {
        this.highlightManager.clearMethodHighlights();
        this.highlightManager.clearAllHighlights();
    }
}
