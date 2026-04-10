/**
 * settingsPanel.ts
 * Pro-gated Settings UI panel — WebviewPanel for managing SaveFlow settings
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  isProActivated,
  SAVEFLOW_PRO_ANNUAL_URL,
  SAVEFLOW_PRO_LIFETIME_URL
} from '../lib/licenceValidator';

let currentPanel: vscode.WebviewPanel | undefined;

/**
 * Opens the SaveFlow Settings UI panel.
 * Pro users see the full settings interface; free users see an upgrade prompt.
 */
export async function openSettingsPanel(context: vscode.ExtensionContext): Promise<void> {
  const isPro = await isProActivated();

  // If panel already exists, reveal it
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    return;
  }

  // Create new webview panel
  currentPanel = vscode.window.createWebviewPanel(
    'saveflowSettings',
    'SaveFlow Settings',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
    }
  );

  // Set the webview's HTML content
  currentPanel.webview.html = getWebviewContent(context, currentPanel.webview, isPro);

  // Handle messages from the webview
  currentPanel.webview.onDidReceiveMessage(
    async (message) => {
      await handleWebviewMessage(message);
    },
    undefined,
    context.subscriptions
  );

  // Clean up when panel is closed
  currentPanel.onDidDispose(
    () => {
      currentPanel = undefined;
    },
    undefined,
    context.subscriptions
  );

  // Send current settings to the webview
  if (isPro) {
    await sendCurrentSettings(currentPanel.webview);
  }
}

/**
 * Handles messages from the webview.
 */
async function handleWebviewMessage(message: any): Promise<void> {
  const config = vscode.workspace.getConfiguration('saveflow');

  switch (message.command) {
    case 'updateSetting':
      try {
        await config.update(message.key, message.value, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(`Setting updated: ${message.key}`);
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to update setting: ${err instanceof Error ? err.message : String(err)}`);
      }
      break;

    case 'activatePro':
      // Trigger the Pro activation command
      await vscode.commands.executeCommand('saveflow.activatePro');
      break;

    case 'openExternal':
      if (typeof message.url === 'string') {
        await vscode.env.openExternal(vscode.Uri.parse(message.url));
      }
      break;

    case 'refresh':
      // Send current settings back to the webview
      if (currentPanel) {
        await sendCurrentSettings(currentPanel.webview);
      }
      break;
  }
}

/**
 * Sends current SaveFlow settings to the webview.
 */
async function sendCurrentSettings(webview: vscode.Webview): Promise<void> {
  const config = vscode.workspace.getConfiguration('saveflow');

  const settings = {
    scss: {
      enabled: config.get('scss.enabled', true),
      outputDirectory: config.get('scss.outputDirectory', ''),
      minify: config.get('scss.minify', false),
      sourceMaps: config.get('scss.sourceMaps', false)
    },
    less: {
      enabled: config.get('less.enabled', true),
      outputDirectory: config.get('less.outputDirectory', ''),
      minify: config.get('less.minify', false)
    },
    stylus: {
      enabled: config.get('stylus.enabled', true),
      outputDirectory: config.get('stylus.outputDirectory', ''),
      minify: config.get('stylus.minify', false)
    },
    typescript: {
      enabled: config.get('typescript.enabled', false),
      outputDirectory: config.get('typescript.outputDirectory', ''),
      sourceMaps: config.get('typescript.sourceMaps', false)
    },
    ignore: config.get('ignore', [])
  };

  await webview.postMessage({ command: 'loadSettings', settings });
}

/**
 * Generates the HTML content for the webview.
 */
function getWebviewContent(
  context: vscode.ExtensionContext,
  _webview: vscode.Webview,
  isPro: boolean
): string {
  const htmlPath = path.join(context.extensionPath, 'media', 'settings.html');

  if (!fs.existsSync(htmlPath)) {
    return getDefaultHtml(isPro);
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // Replace placeholders
  const nonce = getNonce();
  html = html.replace(/\${nonce}/g, nonce);
  html = html.replace(/\${isPro}/g, String(isPro));
  html = html.replace(/\${annualCheckoutUrl}/g, SAVEFLOW_PRO_ANNUAL_URL);
  html = html.replace(/\${lifetimeCheckoutUrl}/g, SAVEFLOW_PRO_LIFETIME_URL);

  return html;
}

/**
 * Fallback HTML if settings.html doesn't exist.
 */
function getDefaultHtml(isPro: boolean): string {
  const nonce = getNonce();

  if (!isPro) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SaveFlow Settings</title>
        <style>
          body {
            padding: 2rem;
            text-align: center;
            font-family: var(--vscode-font-family);
          }
          .pro-cta {
            max-width: 500px;
            margin: 0 auto;
          }
          h1 { color: var(--vscode-foreground); }
          p { color: var(--vscode-descriptionForeground); }
          button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            font-size: 1rem;
            border-radius: 4px;
            margin-top: 1rem;
          }
          button:hover {
            background: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <div class="pro-cta">
          <h1>Settings UI — Pro Feature</h1>
          <p>Upgrade to SaveFlow Pro to access the visual settings panel.</p>
          <p>Pro includes TypeScript compilation, source maps, and this settings UI.</p>
          <button onclick="activatePro()">Activate Pro</button>
        </div>
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          function activatePro() {
            vscode.postMessage({ command: 'activatePro' });
          }
        </script>
      </body>
      </html>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SaveFlow Settings</title>
      <style>
        body {
          padding: 2rem;
          font-family: var(--vscode-font-family);
        }
        h1 { color: var(--vscode-foreground); margin-bottom: 2rem; }
        .section {
          margin-bottom: 2rem;
          padding: 1rem;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
        }
        .setting {
          margin-bottom: 1rem;
        }
        label {
          display: block;
          margin-bottom: 0.25rem;
          color: var(--vscode-foreground);
        }
        input[type="text"] {
          width: 100%;
          padding: 0.5rem;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
        }
        input[type="checkbox"] {
          margin-right: 0.5rem;
        }
      </style>
    </head>
    <body>
      <h1>SaveFlow Settings</h1>
      <p>Full settings UI coming soon. For now, use VS Code settings (Ctrl+,).</p>
    </body>
    </html>
  `;
}

/**
 * Generates a random nonce for CSP.
 */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
