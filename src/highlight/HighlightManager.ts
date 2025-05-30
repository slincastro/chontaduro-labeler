import * as vscode from 'vscode';
import { Uri } from 'vscode';

export class HighlightManager {
    private maxDepthDecorationType: vscode.TextEditorDecorationType;
    private duplicatedCodeDecorationType: vscode.TextEditorDecorationType;
    private duplicatedCodeDecorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
    private methodDecorationTypes: Map<number, vscode.TextEditorDecorationType> = new Map();
    private loopDecorationType: vscode.TextEditorDecorationType | null = null;

    constructor(private readonly extensionUri: vscode.Uri) {
        this.maxDepthDecorationType = vscode.window.createTextEditorDecorationType({
            gutterIconPath: Uri.joinPath(this.extensionUri, 'media', 'icon-inverted.svg'),
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

    public clearMaxDepthHighlight(): void {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.setDecorations(this.maxDepthDecorationType, []);
        }
    }

    public clearAllHighlights(): void {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Clear max depth highlight
            editor.setDecorations(this.maxDepthDecorationType, []);
            
            // Clear duplicated code highlights
            editor.setDecorations(this.duplicatedCodeDecorationType, []);
            this.duplicatedCodeDecorationTypes.forEach((decorationType) => {
                editor.setDecorations(decorationType, []);
                decorationType.dispose();
            });
            this.duplicatedCodeDecorationTypes.clear();
            
            // Clear method highlights
            this.methodDecorationTypes.forEach((decorationType) => {
                editor.setDecorations(decorationType, []);
                decorationType.dispose();
            });
            this.methodDecorationTypes.clear();
            
            // Clear loop highlight
            if (this.loopDecorationType) {
                editor.setDecorations(this.loopDecorationType, []);
                this.loopDecorationType.dispose();
                this.loopDecorationType = null;
            }
        }
    }

    public clearMethodHighlights(): void {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Clear method highlights
            this.methodDecorationTypes.forEach((decorationType) => {
                editor.setDecorations(decorationType, []);
                decorationType.dispose();
            });
            this.methodDecorationTypes.clear();
        }
    }

    public highlightMaxDepth(document: vscode.TextDocument, lineNumber: number): void {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.uri.toString() === document.uri.toString()) {
            const position = new vscode.Position(lineNumber, 0);
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

    public highlightDuplicatedCode(document: vscode.TextDocument, duplicatedBlocks: { startLine: number, endLine: number, blockId?: string }[]): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
            return;
        }
        
        // Clear any existing decorations and dispose them
        editor.setDecorations(this.duplicatedCodeDecorationType, []);
        
        // Dispose of all existing decoration types
        this.duplicatedCodeDecorationTypes.forEach((decorationType, blockId) => {
            editor.setDecorations(decorationType, []);
            decorationType.dispose();
        });
        
        // Clear the map of decoration types
        this.duplicatedCodeDecorationTypes.clear();
        
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
            // Always create a new decoration type for this blockId
            const color = colors[colorIndex % colors.length];
            const rulerColor = color.replace('0.2', '0.7');
            
            this.duplicatedCodeDecorationTypes.set(blockId, vscode.window.createTextEditorDecorationType({
                backgroundColor: color,
                overviewRulerColor: rulerColor,
                overviewRulerLane: vscode.OverviewRulerLane.Right,
                before: {
                    contentText: `${blockId} `,
                    color: '#ffffff', // Pure white color
                    backgroundColor: '#333333', // Dark background for contrast
                    margin: '0 5px 0 0',
                    border: '0px' // Remove border
                }
            }));
            
            colorIndex++;
            
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

    public highlightMethods(document: vscode.TextDocument, methodBlocks: { startLine: number, endLine: number, size: number, name?: string }[]): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
            return;
        }
        
        // Clear any existing method decorations and dispose them
        this.methodDecorationTypes.forEach(decorationType => {
            editor.setDecorations(decorationType, []);
            decorationType.dispose();
        });
        
        // Clear the map of decoration types
        this.methodDecorationTypes.clear();
        
        // Define a set of colors for different methods
        const colors = [
            'rgba(255, 165, 0, 0.2)',  // Orange
            'rgba(0, 128, 255, 0.2)',  // Blue
            'rgba(255, 0, 0, 0.2)',    // Red
            'rgba(0, 255, 0, 0.2)',    // Green
            'rgba(128, 0, 128, 0.2)',  // Purple
            'rgba(255, 192, 203, 0.2)', // Pink
            'rgba(0, 255, 255, 0.2)',  // Cyan
            'rgba(255, 255, 0, 0.2)'   // Yellow
        ];
        
        // Create decorations for each method
        methodBlocks.forEach((block, index) => {
            const colorIndex = index % colors.length;
            const color = colors[colorIndex];
            const rulerColor = color.replace('0.2', '0.7');
            
            // Always create a new decoration type for each method
            this.methodDecorationTypes.set(index, vscode.window.createTextEditorDecorationType({
                backgroundColor: color,
                overviewRulerColor: rulerColor,
                overviewRulerLane: vscode.OverviewRulerLane.Right,
                before: {
                    contentText: `${block.name || 'Method'} (${block.size} líneas) `,
                    color: '#ffffff', // Pure white color
                    backgroundColor: '#333333', // Dark background for contrast
                    margin: '0 15px 0 0',
                    border: '0px' // Remove border
                }
            }));
            
            // Create range for this method
            const startPos = new vscode.Position(block.startLine, 0);
            const endPos = new vscode.Position(block.endLine, document.lineAt(Math.min(block.endLine, document.lineCount - 1)).text.length);
            const range = new vscode.Range(startPos, endPos);
            
            // Apply the decoration
            const decorationType = this.methodDecorationTypes.get(index);
            if (decorationType) {
                editor.setDecorations(decorationType, [range]);
            }
        });
        
        if (methodBlocks.length > 0) {
            const firstBlock = methodBlocks[0];
            const startPos = new vscode.Position(firstBlock.startLine, 0);
            const endPos = new vscode.Position(firstBlock.endLine, document.lineAt(Math.min(firstBlock.endLine, document.lineCount - 1)).text.length);
            
            editor.revealRange(
                new vscode.Range(startPos, endPos),
                vscode.TextEditorRevealType.InCenter
            );
        }
    }

    public highlightLoops(document: vscode.TextDocument, loopBlocks: { startLine: number, endLine: number, loopType: string }[]): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
            return;
        }
        
        // Dispose of previous loop decoration type if it exists
        if (this.loopDecorationType) {
            editor.setDecorations(this.loopDecorationType, []);
            this.loopDecorationType.dispose();
            this.loopDecorationType = null;
        }
        
        // Create a new loop decoration type
        this.loopDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(65, 105, 225, 0.2)', // Royal blue with transparency
            overviewRulerColor: 'rgba(65, 105, 225, 0.7)',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            before: {
                contentText: '⟳ ', // Loop symbol
                color: '#4169E1',
                margin: '0 5px 0 0'
            }
        });
        
        const ranges: vscode.Range[] = [];
        
        for (const block of loopBlocks) {
            const startPos = new vscode.Position(block.startLine, 0);
            const endPos = new vscode.Position(block.startLine, document.lineAt(block.startLine).text.length);
            ranges.push(new vscode.Range(startPos, endPos));
        }
        
        editor.setDecorations(this.loopDecorationType, ranges);
        
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

    public dispose(): void {
        // Dispose of all decoration types
        this.maxDepthDecorationType.dispose();
        this.duplicatedCodeDecorationType.dispose();
        this.duplicatedCodeDecorationTypes.forEach(decorationType => decorationType.dispose());
        this.methodDecorationTypes.forEach(decorationType => decorationType.dispose());
        if (this.loopDecorationType) {
            this.loopDecorationType.dispose();
        }
    }
}
