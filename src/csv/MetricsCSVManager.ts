import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MetricExtractor, MetricResult } from '../metrics/MetricExtractor';

export class MetricsCSVManager {
    private csvFilePath: string | null = null;
    private output: vscode.OutputChannel;
    
    constructor(
        private readonly metricExtractors: MetricExtractor[],
        outputChannel: vscode.OutputChannel
    ) {
        this.output = outputChannel;
        this.initializeCSVFile();
    }
    
    /**
     * Gets the number of files processed (number of rows in the CSV file excluding the header)
     * @returns The number of files processed
     */
    public getProcessedFilesCount(): number {
        if (!this.csvFilePath || !fs.existsSync(this.csvFilePath)) {
            return 0;
        }
        
        try {
            const content = fs.readFileSync(this.csvFilePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim().length > 0);
            
            // Subtract 1 for the header row
            return Math.max(0, lines.length - 1);
        } catch (error) {
            this.output.appendLine(`Error counting processed files: ${error}`);
            return 0;
        }
    }
    
    /**
     * Initializes the CSV file with headers if it doesn't exist
     */
    private initializeCSVFile(): void {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const metricsDir = path.join(workspaceFolder.uri.fsPath, 'metrics-data');
            this.csvFilePath = path.join(metricsDir, 'metrics.csv');
            
            // Create metrics directory if it doesn't exist
            if (!fs.existsSync(metricsDir)) {
                fs.mkdirSync(metricsDir, { recursive: true });
                this.output.appendLine(`Created metrics directory: ${metricsDir}`);
            }
            
            // Create CSV header if file doesn't exist
            if (!fs.existsSync(this.csvFilePath)) {
                const header = ['UUID', 'Timestamp', 'LabelingDateTime', 'Filename', 'FilePath', 'NeedsRefactoring'];
                
                // Add metric names to header
                this.metricExtractors.forEach(extractor => {
                    header.push(extractor.name);
                });
                
                fs.writeFileSync(this.csvFilePath, header.join(',') + '\n');
                this.output.appendLine(`Created metrics CSV file: ${this.csvFilePath}`);
            }
        }
    }
    
    /**
     * Saves the document's metrics to the CSV file
     * @param document The document to extract metrics from
     * @param needsRefactoring Whether the file needs refactoring (1 for yes, 0 for no)
     */
    public saveMetricsToCSV(document: vscode.TextDocument, needsRefactoring: boolean = false): void {
        if (!this.csvFilePath) return;

        try {
            const uuid = uuidv4();
            const timestamp = new Date().toISOString();
            const fileName = document.uri.fsPath.split('/').pop() || 'Unknown';
            const filePath = document.uri.fsPath;
            
            // Extract all metrics
            const metricValues: number[] = [];
            for (const extractor of this.metricExtractors) {
                const result = extractor.extract(document);
                metricValues.push(result.value);
            }
            
            // Create CSV row
            const row = [
                uuid,
                timestamp,
                new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }),
                this.escapeCsvValue(fileName),
                this.escapeCsvValue(filePath),
                needsRefactoring ? '1' : '0',
                ...metricValues
            ];
            
            // Append to CSV file
            fs.appendFileSync(this.csvFilePath, row.join(',') + '\n');
            this.output.appendLine(`Metrics saved to CSV for file: ${fileName}`);
        } catch (error) {
            this.output.appendLine(`Error saving metrics to CSV: ${error}`);
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
}
