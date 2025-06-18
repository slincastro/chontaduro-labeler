/*  ──────────────────────────────────────────────────────────────────────────
    Archivo: media/webview.js
    Contiene TODO el JavaScript que antes vivía embebido en la plantilla.
    Mantiene exactamente la misma funcionalidad y nombres de comandos.
    ────────────────────────────────────────────────────────────────────────── */

/* global acquireVsCodeApi */
(() => {
  const vscode = acquireVsCodeApi();

  /* ╭────────── Utilidades de UI ──────────╮ */

  function setLanguageInfo(name, icon, color) {
    const container   = document.getElementById('languageInfoContainer');
    const iconElement = document.getElementById('languageIconElement');
    const nameElement = document.getElementById('languageNameElement');
    const fileElement = document.getElementById('fileNameElement');
    if (!container || !iconElement || !nameElement || !fileElement) return;

    container.style.backgroundColor = color;
    iconElement.className           = `${icon} language-icon`;
    nameElement.textContent         = name;

    /* Si el título lleva la ruta completa, quédate solo con el archivo */
    const txt = fileElement.textContent || '';
    if (txt.includes('/')) fileElement.textContent = txt.split('/').pop();
  }

  /* ╭────────── Comunicación con la extensión ──────────╮ */
  const send = (command, payload = {}) => vscode.postMessage({ command, ...payload });

  function navigate(direction)             { send('navigate',              { direction });        }
  function toggleRefactoring(checked)      { send('toggleRefactoring',     { checked   });        }
  function openCsvFile()                   { send('openCsvFile');                                  }

  /* Highlights */
  function highlightDuplicatedCode()       { send('highlightDuplicatedCode'); }
  function highlightLoops()                { send('highlightLoops');          }
  function highlightMethods()              { send('highlightMethods');        }
  function highlightMaxDepth()             { send('highlightMaxDepth');       }
  function highlightIfs()                  { send('highlightIfs');            }
  function highlightConstructors()         { send('highlightConstructors');   }
  function highlightLambdas()              { send('highlightLambdas');        }

  /* ╭────────── Collapsibles ──────────╮ */
  function toggleCollapsible(el) {
    el.classList.toggle('active');
    const content = el.nextElementSibling;

    if (content.style.maxHeight) {
      content.style.maxHeight = null;
      el.querySelector('.collapsible-dots').textContent = '...';
    } else {
      content.style.maxHeight = `${content.scrollHeight}px`;
      el.querySelector('.collapsible-dots').textContent = '▼';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    Array.from(document.getElementsByClassName('collapsible'))
      .forEach(el => el.addEventListener('click', () => toggleCollapsible(el)));
  });

  /* ╭────────── Panel de configuración ──────────╮ */
  function openSettings()  {
    document.getElementById('settingsPanel').style.display = 'flex';
    send('getSettings');
  }
  function closeSettings() {
    document.getElementById('settingsPanel').style.display = 'none';
  }
  function saveSettings()  {
    send('saveSettings', {
      settings: {
        apiKey: document.getElementById('apiKey').value,
        model:  document.getElementById('model').value
      }
    });
    closeSettings();
  }

  /* ╭────────── Mensajes desde la extensión ──────────╮ */
  window.addEventListener('message', (event) => {
    const msg = event.data;

    switch (msg.command) {
      case 'resetRefactoringCheckbox':
        document.getElementById('refactoringCheckbox').checked = false;
        break;
      case 'setLanguageInfo':
        setLanguageInfo(msg.name, msg.icon, msg.color);
        break;
      case 'setSettings':
        document.getElementById('apiKey').value = msg.settings?.apiKey || '';
        document.getElementById('model').value  = msg.settings?.model  || 'gpt-3.5-turbo';
        break;
      case 'openSettings':
        openSettings();
        break;
    }
  });

  /* ╭────────── Inicialización ──────────╮ */
  setLanguageInfo('Loading...', 'fas fa-code', '#808080');
  setTimeout(() => send('webviewReady'), 100);
})();