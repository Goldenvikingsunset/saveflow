import * as vscode from 'vscode';
import * as path from 'path';
import { compileScss } from './compilers/scss';
import { compileLess } from './compilers/less';
import { compileStylus } from './compilers/stylus';
import { compileTypescript } from './compilers/typescript';
import { getScssConfig, getLessConfig, getStylusConfig, getTypescriptConfig } from './lib/config';
import { reportErrors, clearErrors } from './lib/problemReporter';
import { isPartial, resolveRootFiles, invalidateFile } from './lib/importGraph';
import { isIgnored } from './lib/outputResolver';
import {
  init as initLicenceValidator,
  activateProCommand,
  deactivateProCommand,
  deactivateStoredLicence,
  isProActivated,
  promptProUpgrade
} from './lib/licenceValidator';
import { openSettingsPanel } from './panels/settingsPanel';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('SaveFlow');
  outputChannel.appendLine('SaveFlow activated.');

  // Initialize licence validator with context
  initLicenceValidator(context);
  registerOptionalUninstallHook(context);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('saveflow.activatePro', () =>
      activateProCommand()
    ),
    vscode.commands.registerCommand('saveflow.deactivatePro', () =>
      deactivateProCommand()
    ),
    vscode.commands.registerCommand('saveflow.showOutput', () =>
      outputChannel.show()
    ),
    vscode.commands.registerCommand('saveflow.compileFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        handleSave(editor.document);
      }
    }),
    vscode.commands.registerCommand('saveflow.openSettings', () =>
      openSettingsPanel(context)
    )
  );

  // The core event — fires only on actual saves, no polling
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(doc => handleSave(doc))
  );

  // Keep import graph in sync when SCSS files are created or deleted
  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles(event => {
      for (const file of event.files) {
        if (file.fsPath.match(/\.(scss|sass)$/i)) {
          outputChannel.appendLine(`[ImportGraph] File created: ${file.fsPath}`);
          invalidateFile(file.fsPath);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidDeleteFiles(event => {
      for (const file of event.files) {
        if (file.fsPath.match(/\.(scss|sass)$/i)) {
          outputChannel.appendLine(`[ImportGraph] File deleted: ${file.fsPath}`);
          invalidateFile(file.fsPath);
        }
      }
    })
  );

  context.subscriptions.push(outputChannel);
}

export function deactivate(): void {
  // Disposables in context.subscriptions are cleaned up automatically
}

function registerOptionalUninstallHook(context: vscode.ExtensionContext): void {
  type ExtensionsWithOptionalUninstall = typeof vscode.extensions & {
    onDidUninstall?: vscode.Event<unknown>;
  };

  const extensionsApi = vscode.extensions as ExtensionsWithOptionalUninstall;
  if (!extensionsApi.onDidUninstall) {
    return;
  }

  const disposable = extensionsApi.onDidUninstall(event => {
    if (!isSaveFlowUninstallEvent(event)) {
      return;
    }
    void deactivateStoredLicence(true);
  });

  context.subscriptions.push(disposable);
}

function isSaveFlowUninstallEvent(event: unknown): boolean {
  const extensionId = readExtensionId(event);
  return extensionId === 'ginger-turtle.saveflow';
}

function readExtensionId(event: unknown): string | null {
  if (typeof event === 'string') {
    return event;
  }

  if (typeof event !== 'object' || event === null) {
    return null;
  }

  if ('id' in event && typeof event.id === 'string') {
    return event.id;
  }

  if ('identifier' in event && typeof event.identifier === 'object' && event.identifier !== null) {
    const identifier = event.identifier;
    if ('id' in identifier && typeof identifier.id === 'string') {
      return identifier.id;
    }
  }

  return null;
}

async function handleSave(
  document: vscode.TextDocument
): Promise<void> {
  const filePath = document.fileName;
  const langId = document.languageId;

  // Ignore files matching saveflow.ignore globs
  if (isIgnored(filePath)) {
    return;
  }

  switch (langId) {
    case 'scss':
    case 'sass':
      await handleScss(filePath);
      break;
    case 'less':
      await handleLess(filePath);
      break;
    case 'stylus':
      await handleStylus(filePath);
      break;
    case 'typescript':
    case 'typescriptreact':
      await handleTypescript(filePath);
      break;
  }
}

async function handleScss(filePath: string): Promise<void> {
  const config = getScssConfig();
  if (!config.enabled) {
    return;
  }

  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);

  // Partials trigger their parent root files, not themselves
  if (isPartial(basename)) {
    const rootFiles = await resolveRootFiles(filePath);
    outputChannel.appendLine(`[SCSS] Partial saved — recompiling ${rootFiles.length} root file(s)`);
    for (const rootFile of rootFiles) {
      await compileSingleScss(rootFile, config);
    }
    return;
  }

  await compileSingleScss(filePath, config);
}

async function compileSingleScss(
  filePath: string,
  config: ReturnType<typeof getScssConfig>
): Promise<void> {
  outputChannel.appendLine(`[SCSS] Compiling: ${filePath}`);
  const result = await compileScss(filePath, config, outputChannel);

  if (result.success) {
    clearErrors(filePath);
    outputChannel.appendLine(`[SCSS] OK: ${filePath}`);
    // Intentionally silent on success — no notification
  } else {
    reportErrors(filePath, result.errors, 'scss');
    outputChannel.appendLine(`[SCSS] Failed: ${filePath} — ${result.errors.length} error(s)`);
  }
}

async function handleLess(filePath: string): Promise<void> {
  const config = getLessConfig();
  if (!config.enabled) {
    return;
  }

  outputChannel.appendLine(`[Less] Compiling: ${filePath}`);
  const result = await compileLess(filePath, config, outputChannel);

  if (result.success) {
    clearErrors(filePath);
  } else {
    reportErrors(filePath, result.errors, 'less');
  }
}

async function handleStylus(filePath: string): Promise<void> {
  const config = getStylusConfig();
  if (!config.enabled) {
    return;
  }

  outputChannel.appendLine(`[Stylus] Compiling: ${filePath}`);
  const result = await compileStylus(filePath, config, outputChannel);

  if (result.success) {
    clearErrors(filePath);
  } else {
    reportErrors(filePath, result.errors, 'stylus');
  }
}

async function handleTypescript(filePath: string): Promise<void> {
  // Pro gate — check licence first
  const isPro = await isProActivated();
  if (!isPro) {
    await promptProUpgrade('TypeScript compilation');
    return;
  }

  const config = getTypescriptConfig();
  if (!config.enabled) {
    return;
  }

  outputChannel.appendLine(`[TypeScript] Compiling: ${filePath}`);
  const result = await compileTypescript(filePath, config, outputChannel);

  if (result.success) {
    clearErrors(filePath);
    outputChannel.appendLine(`[TypeScript] OK: ${filePath}`);
  } else {
    reportErrors(filePath, result.errors, 'typescript');
    outputChannel.appendLine(`[TypeScript] Failed: ${filePath} — ${result.errors.length} error(s)`);
  }
}
