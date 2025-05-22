import * as vscode from 'vscode';
import * as path from 'path';

export interface LanguageInfo {
    name: string;
    icon: string;
    color: string;
}

export class LanguageDetector {
    private static readonly languageMap: Record<string, LanguageInfo> = {
        // C# related
        'cs': { name: 'C#', icon: 'fab fa-microsoft', color: '#178600' },
        
        // JavaScript related
        'js': { name: 'JavaScript', icon: 'fab fa-js-square', color: '#f7df1e' },
        'jsx': { name: 'React JSX', icon: 'fab fa-react', color: '#61dafb' },
        'ts': { name: 'TypeScript', icon: 'fab fa-js-square', color: '#007acc' },
        'tsx': { name: 'React TSX', icon: 'fab fa-react', color: '#007acc' },
        
        // Web related
        'html': { name: 'HTML', icon: 'fab fa-html5', color: '#e34c26' },
        'css': { name: 'CSS', icon: 'fab fa-css3-alt', color: '#264de4' },
        'scss': { name: 'SCSS', icon: 'fab fa-sass', color: '#c6538c' },
        'less': { name: 'LESS', icon: 'fab fa-css3', color: '#1d365d' },
        
        // Python related
        'py': { name: 'Python', icon: 'fab fa-python', color: '#3572A5' },
        'ipynb': { name: 'Jupyter Notebook', icon: 'fab fa-python', color: '#DA5B0B' },
        
        // Java related
        'java': { name: 'Java', icon: 'fab fa-java', color: '#b07219' },
        
        // PHP related
        'php': { name: 'PHP', icon: 'fab fa-php', color: '#4F5D95' },
        
        // Ruby related
        'rb': { name: 'Ruby', icon: 'fas fa-gem', color: '#701516' },
        
        // Go related
        'go': { name: 'Go', icon: 'fas fa-code', color: '#00ADD8' },
        
        // Rust related
        'rs': { name: 'Rust', icon: 'fas fa-cogs', color: '#dea584' },
        
        // Swift related
        'swift': { name: 'Swift', icon: 'fab fa-swift', color: '#ffac45' },
        
        // Kotlin related
        'kt': { name: 'Kotlin', icon: 'fab fa-android', color: '#A97BFF' },
        
        // Shell related
        'sh': { name: 'Shell', icon: 'fas fa-terminal', color: '#89e051' },
        'bash': { name: 'Bash', icon: 'fas fa-terminal', color: '#89e051' },
        
        // Other languages
        'json': { name: 'JSON', icon: 'fas fa-code', color: '#292929' },
        'xml': { name: 'XML', icon: 'fas fa-code', color: '#0060ac' },
        'md': { name: 'Markdown', icon: 'fas fa-markdown', color: '#083fa1' },
        'sql': { name: 'SQL', icon: 'fas fa-database', color: '#e38c00' },
        'yaml': { name: 'YAML', icon: 'fas fa-file-code', color: '#cb171e' },
        'yml': { name: 'YAML', icon: 'fas fa-file-code', color: '#cb171e' },
    };

    /**
     * Detects the programming language based on the document
     */
    public static detectLanguage(document: vscode.TextDocument): LanguageInfo {
        // Get file extension
        const extension = path.extname(document.fileName).toLowerCase().substring(1);
        
        // Check if we have a mapping for this extension
        if (extension in this.languageMap) {
            return this.languageMap[extension];
        }
        
        // Try to get language ID from VSCode
        const languageId = document.languageId.toLowerCase();
        if (languageId in this.languageMap) {
            return this.languageMap[languageId];
        }
        
        // Default language info if we can't detect
        return {
            name: extension ? extension.toUpperCase() : 'Unknown',
            icon: 'fas fa-file-code',
            color: '#808080'
        };
    }
}
