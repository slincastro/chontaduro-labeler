import * as vscode from 'vscode';
import { MetricsCSVManager } from '../csv/MetricsCSVManager';
import { MetricFactory } from '../metrics/MetricFactory';
import { HighlightManager } from '../highlight/HighlightManager';

export class NavigationManager {
    private files: vscode.Uri[] = [];
    private currentIndex: number = 0;
    private csvManager: MetricsCSVManager;
    private needsRefactoring: boolean = false;
    private highlightManager: HighlightManager;
    private output: vscode.OutputChannel;

    constructor(
        private readonly extensionUri: vscode.Uri,
        output: vscode.OutputChannel
    ) {
        const defaultMetrics = MetricFactory.getCommonMetrics();
        this.csvManager = new MetricsCSVManager(defaultMetrics, output);
        this.highlightManager = new HighlightManager(this.extensionUri);
        this.output = output;
    }

    public get currentFileIndex(): number {
        return this.currentIndex;
    }

    public get currentFile(): vscode.Uri | undefined {
        if (this.files.length === 0) return undefined;
        return this.files[this.currentIndex];
    }

    public get hasFiles(): boolean {
        return this.files.length > 0;
    }

    public setNeedsRefactoring(value: boolean): void {
        this.needsRefactoring = value;
    }

    public resetNeedsRefactoring(): void {
        this.needsRefactoring = false;
    }

    public async loadProjectFiles(): Promise<void> {
        const csFiles = await vscode.workspace.findFiles('**/*.cs', '**/node_modules/**');
        const pyFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**');
        
        this.files = [...csFiles, ...pyFiles].sort((a, b) => a.fsPath.localeCompare(b.fsPath));
        
        const activeUri = vscode.window.activeTextEditor?.document.uri;
        this.currentIndex = this.files.findIndex(uri => uri.toString() === activeUri?.toString());
        if (this.currentIndex === -1 && this.files.length > 0) {
            this.currentIndex = 0;
        }
    }

    public async navigateFile(direction: 'next' | 'prev'): Promise<void> {
        if (this.files.length === 0) return;
        
        this.highlightManager.clearMethodHighlights();
        this.highlightManager.clearAllHighlights();

        if (direction === 'next' && this.currentIndex >= 0 && this.currentIndex < this.files.length) {
            const currentUri = this.files[this.currentIndex];
            try {
                const currentDoc = await vscode.workspace.openTextDocument(currentUri);
                const metrics = MetricFactory.getMetricsForLanguage(currentDoc.languageId.toLowerCase());
                this.csvManager = new MetricsCSVManager(metrics, this.output);
                this.csvManager.saveMetricsToCSV(currentDoc, this.needsRefactoring);
                
                this.needsRefactoring = false;
            } catch (error) {
                this.output.appendLine(`Error saving metrics before navigation: ${error}`);
            }
        }

        if (direction === 'next') {
            this.currentIndex = (this.currentIndex + 1) % this.files.length;
        } else if (direction === 'prev') {
            this.currentIndex = (this.currentIndex - 1 + this.files.length) % this.files.length;
        }

        const uri = this.files[this.currentIndex];
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
    }

    public getProcessedFilesCount(): number {
        return this.csvManager.getProcessedFilesCount();
    }
}
