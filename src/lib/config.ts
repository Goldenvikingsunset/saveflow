import * as vscode from 'vscode';

/** Typed accessor for SCSS settings. */
export function getScssConfig() {
  const cfg = vscode.workspace.getConfiguration('saveflow.scss');
  return {
    enabled: cfg.get<boolean>('enabled', true),
    outputDirectory: cfg.get<string>('outputDirectory', ''),
    minify: cfg.get<boolean>('minify', false),
    sourceMaps: cfg.get<boolean>('sourceMaps', false),
  };
}

/** Typed accessor for Less settings. */
export function getLessConfig() {
  const cfg = vscode.workspace.getConfiguration('saveflow.less');
  return {
    enabled: cfg.get<boolean>('enabled', true),
    outputDirectory: cfg.get<string>('outputDirectory', ''),
    minify: cfg.get<boolean>('minify', false),
  };
}

/** Typed accessor for Stylus settings. */
export function getStylusConfig() {
  const cfg = vscode.workspace.getConfiguration('saveflow.stylus');
  return {
    enabled: cfg.get<boolean>('enabled', true),
    outputDirectory: cfg.get<string>('outputDirectory', ''),
    minify: cfg.get<boolean>('minify', false),
  };
}

/** Typed accessor for TypeScript settings (Pro). */
export function getTypescriptConfig() {
  const cfg = vscode.workspace.getConfiguration('saveflow.typescript');
  return {
    enabled: cfg.get<boolean>('enabled', false),
    outputDirectory: cfg.get<string>('outputDirectory', ''),
    sourceMaps: cfg.get<boolean>('sourceMaps', false),
  };
}

/** Returns the list of glob patterns to ignore. */
export function getIgnoreGlobs(): string[] {
  return vscode.workspace.getConfiguration('saveflow').get<string[]>('ignore', []);
}
