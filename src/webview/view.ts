export class Webview {
public getHtml(title: string, processedFilesCount: number, content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Refactorial</title>
          <script src="https://kit.fontawesome.com/6a2b987c6b.js" crossorigin="anonymous"></script>
          <style>
            .language-info {
              display: flex;
              align-items: center;
              margin-bottom: 1em;
              padding: 0.5em;
              border-radius: 8px;
              color: white;
            }
            .language-icon {
              font-size: 1.5em;
              margin-right: 0.5em;
            }
            .language-name {
              font-weight: bold;
              font-size: 1.2em;
            }
            .language-subtitle {
              font-size: 0.9em;
            }
            .nav-buttons {
              margin-top: 1.5em;
              display: flex;
              gap: 1em;
              justify-content: center;
            }
            .nav-buttons button {
              background-color: #2c3e50;
              color: white;
              border: none;
              padding: 0.75em 1.5em;
              border-radius: 8px;
              font-size: 1rem;
              font-weight: 500;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 0.5em;
              transition: background-color 0.3s ease;
            }
            .nav-buttons button:hover {
              background-color: #34495e;
            }
            .nav-buttons button:active {
              transform: scale(0.98);
            }
            .nav-buttons i {
              font-size: 1.2em;
            }
            
            /* Styles for metrics table */
            .metrics-table {
              width: 100%;
              border-collapse: collapse;
              margin: 1em 0;
              font-size: 0.95em;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              border-radius: 8px;
              overflow: hidden;
            }
            
            .metrics-table thead {
              background-color: #2c3e50;
              color: white;
            }
            
            .metrics-table th {
              padding: 12px 15px;
              text-align: left;
              font-weight: bold;
            }
            
            .metrics-table td {
              padding: 10px 15px;
              border-bottom: 1px solid #ddd;
            }
            
            .metrics-table tbody tr:nth-child(even) {
              background-color: rgba(0, 0, 0, 0.05);
            }
            
            .metrics-table tbody tr:hover {
              background-color: rgba(0, 0, 0, 0.075);
            }
            
            .metrics-table td:first-child {
              font-weight: bold;
              text-align: center;
              width: 80px;
            }
          </style>
        </head>
        <body style="font-family: sans-serif; padding: 1em;">
          <div id="languageInfoContainer" class="language-info">
            <i id="languageIconElement" class="language-icon"></i>
            <div>
              <div id="languageNameElement" class="language-name"></div>
              <div class="language-subtitle">Analyzing code metrics</div>
            </div>
          </div>
  
          <div class="nav-buttons">
            <button onclick="navigate('prev')">
              <i class="fas fa-backward"></i> <span>Anterior</span>
            </button>
            <button onclick="navigate('next')">
              <i class="fas fa-forward"></i> <span>Siguiente</span>
            </button>
          </div>
  
          <h3>Analizando ${title}</h3>
  
          <div style="padding: 8px; border-radius: 4px; margin-bottom: 10px; display: flex; align-items: center;">
            <strong>Archivos procesados:</strong> ${processedFilesCount}
            <button onclick="openCsvFile()" style="margin-left: 10px; background: none; border: none; cursor: pointer; color: #0078d7; display: flex; align-items: center; padding: 2px 5px; border-radius: 4px; font-size: 0.9em;" title="Abrir archivo CSV">
              <i class="fas fa-file-csv" style="margin-right: 4px;"></i>
              <span>Abrir CSV</span>
            </button>
          </div>
  
          <p>${content}</p>
  
          <div style="margin-top: 1em; display: flex; align-items: center;">
            <input type="checkbox" id="refactoringCheckbox" onchange="toggleRefactoring(this.checked)">
            <label for="refactoringCheckbox" style="margin-left: 0.5em;">Debe refactorizarse</label>
          </div>
  
          <p style="color: #888; margin-top: 2em;">Powered by ReFactorial !!</p>
  
          <script>
            const vscode = acquireVsCodeApi();
  
            function setLanguageInfo(name, icon, color) {
              const container = document.getElementById('languageInfoContainer');
              const iconElement = document.getElementById('languageIconElement');
              const nameElement = document.getElementById('languageNameElement');
  
              if (!container || !iconElement || !nameElement) {
                console.error('Could not find language info elements');
                return;
              }
  
              container.style.backgroundColor = color;
              iconElement.className = icon + ' language-icon';
              nameElement.textContent = name;
            }
  
            function navigate(direction) {
              vscode.postMessage({ command: 'navigate', direction });
            }
  
            function toggleRefactoring(checked) {
              vscode.postMessage({
                command: 'toggleRefactoring',
                checked: checked
              });
            }
  
            function openCsvFile() {
              vscode.postMessage({
                command: 'openCsvFile'
              });
            }
  
            window.addEventListener('message', event => {
              const message = event.data;
              if (message.command === 'resetRefactoringCheckbox') {
                document.getElementById('refactoringCheckbox').checked = false;
              } else if (message.command === 'setLanguageInfo') {
                setLanguageInfo(message.name, message.icon, message.color);
              }
            });
  
            setLanguageInfo('Loading...', 'fas fa-code', '#808080');
  
            setTimeout(() => {
              vscode.postMessage({ command: 'webviewReady' });
            }, 100);
          </script>
        </body>
      </html>
    `;
  }
}
