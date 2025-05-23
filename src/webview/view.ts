import * as vscode from 'vscode';

export class Webview {
  // Helper method to get webview URI
  private getWebviewUri(webview: vscode.Webview, extensionUri: vscode.Uri, path: string): string {
    return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, path)).toString();
  }

  public getHtml(title: string, processedFilesCount: number, content: string, extensionUri: vscode.Uri, webview: vscode.Webview): string {
    // Get the path to the settings icon
    const settingsIconUri = this.getWebviewUri(webview, extensionUri, 'media/settings-icon.svg');
    
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
              width: 30px;
            }
            
            /* Collapsible metrics styles */
            .collapsible {
              cursor: pointer;
              padding: 10px 15px;
              width: 100%;
              border: none;
              text-align: left;
              outline: none;
              font-size: 1em;
              background-color: #f1f1f1;
              border-radius: 8px;
              margin-bottom: 5px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .collapsible:hover {
              background-color: #e0e0e0;
            }
            
            .collapsible-content {
              padding: 0;
              max-height: 0;
              overflow: hidden;
              transition: max-height 0.2s ease-out;
              background-color: white;
              border-radius: 0 0 8px 8px;
            }
            
            .collapsible-dots {
              display: inline-block;
              width: 20px;
              text-align: center;
            }
            
            .metric-value {
              font-weight: bold;
              margin-right: 10px;
            }
            
            /* Settings icon styles */
            .settings-icon {
              cursor: pointer;
              font-size: 1.2em;
              color: white;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              background-color: rgba(255, 255, 255, 0.2);
              transition: background-color 0.3s ease;
              margin-left: 5px;
            }
            
            .settings-icon:hover {
              background-color: rgba(255, 255, 255, 0.3);
            }
            
            /* Settings panel styles */
            .settings-panel {
              display: none;
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: rgba(0, 0, 0, 0.5);
              z-index: 1000;
              justify-content: center;
              align-items: center;
            }
            
            .settings-content {
              background-color: white;
              padding: 20px;
              border-radius: 8px;
              width: 80%;
              max-width: 500px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            .settings-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
            }
            
            .settings-close {
              cursor: pointer;
              font-size: 1.5em;
              color: #888;
            }
            
            .settings-close:hover {
              color: #333;
            }
            
            .settings-form-group {
              margin-bottom: 15px;
            }
            
            .settings-label {
              display: block;
              margin-bottom: 5px;
              font-weight: bold;
            }
            
            .settings-input {
              width: 100%;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 1em;
            }
            
            .settings-select {
              width: 100%;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 1em;
              background-color: white;
            }
            
            .settings-button {
              background-color: #2c3e50;
              color: white;
              border: none;
              padding: 10px 15px;
              border-radius: 4px;
              font-size: 1em;
              cursor: pointer;
              margin-top: 10px;
            }
            
            .settings-button:hover {
              background-color: #34495e;
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
  
          <div style="margin-top: 1em; display: flex; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <input type="checkbox" id="refactoringCheckbox" onchange="toggleRefactoring(this.checked)">
              <label for="refactoringCheckbox" style="margin-left: 0.5em;">Debe refactorizarse</label>
            </div>

          </div>
  
          <p style="color: #888; margin-top: 2em;">Powered by ReFactorial !!</p>
          
          <!-- Settings Panel -->
          <div id="settingsPanel" class="settings-panel">
            <div class="settings-content">
              <div class="settings-header">
                <h3 style="margin: 0;">Configuración de OpenAI</h3>
                <div class="settings-close" onclick="closeSettings()">×</div>
              </div>
              <div class="settings-form-group">
                <label class="settings-label" for="apiKey">API Key de OpenAI</label>
                <input type="password" id="apiKey" class="settings-input" placeholder="Ingresa tu API key">
              </div>
              <div class="settings-form-group">
                <label class="settings-label" for="model">Modelo</label>
                <select id="model" class="settings-select">
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4o">GPT-4o</option>
                </select>
              </div>
              <button class="settings-button" onclick="saveSettings()">Guardar</button>
            </div>
          </div>
  
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
            
            function toggleCollapsible(element) {
              element.classList.toggle("active");
              const content = element.nextElementSibling;
              
              if (content.style.maxHeight) {
                content.style.maxHeight = null;
                element.querySelector('.collapsible-dots').textContent = "...";
              } else {
                content.style.maxHeight = content.scrollHeight + "px";
                element.querySelector('.collapsible-dots').textContent = "▼";
              }
            }
            
            // Initialize all collapsible elements after the page loads
            document.addEventListener('DOMContentLoaded', function() {
              const collapsibles = document.getElementsByClassName("collapsible");
              for (let i = 0; i < collapsibles.length; i++) {
                collapsibles[i].addEventListener("click", function() {
                  toggleCollapsible(this);
                });
              }
            });
  
            // Settings panel functions
            function openSettings() {
              console.log('openSettings function called in webview');
              
              const panel = document.getElementById('settingsPanel');
              if (!panel) {
                console.error('Settings panel element not found');
                return;
              }
              
              console.log('Setting panel display to flex');
              panel.style.display = 'flex';
              
              // Load saved settings if available
              console.log('Sending getSettings message');
              vscode.postMessage({ command: 'getSettings' });
            }
            
            function closeSettings() {
              const panel = document.getElementById('settingsPanel');
              panel.style.display = 'none';
            }
            
            function saveSettings() {
              const apiKey = document.getElementById('apiKey').value;
              const model = document.getElementById('model').value;
              
              vscode.postMessage({
                command: 'saveSettings',
                settings: {
                  apiKey,
                  model
                }
              });
              
              closeSettings();
            }
            
            window.addEventListener('message', event => {
              const message = event.data;
              if (message.command === 'resetRefactoringCheckbox') {
                document.getElementById('refactoringCheckbox').checked = false;
              } else if (message.command === 'setLanguageInfo') {
                setLanguageInfo(message.name, message.icon, message.color);
              } else if (message.command === 'setSettings') {
                // Fill the settings form with saved values
                if (message.settings) {
                  document.getElementById('apiKey').value = message.settings.apiKey || '';
                  document.getElementById('model').value = message.settings.model || 'gpt-3.5-turbo';
                }
              } else if (message.command === 'openSettings') {
                // Handle the openSettings command from the extension
                openSettings();
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
