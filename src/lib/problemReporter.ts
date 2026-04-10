import * as vscode from 'vscode';
import { CompilerError } from '../compilers/base';

/**
 * One DiagnosticCollection per language so errors don't bleed across compilers.
 * Created lazily and reused across calls.
 */
const collections = new Map<string, vscode.DiagnosticCollection>();

/**
 * Reports compiler errors for a file into the VS Code Problems panel.
 * Clears any previous errors for that file first.
 *
 * @param filePath  Absolute path of the source file that failed
 * @param errors    Errors returned by the compiler
 * @param language  Language key for the DiagnosticCollection ('scss' | 'less' | 'stylus' | 'typescript')
 */
export function reportErrors(
  filePath: string,
  errors: CompilerError[],
  language: string
): void {
  const collection = getCollection(language);
  const uri = vscode.Uri.file(filePath);

  const diagnostics = errors.map(err => {
    const targetUri = err.file ? vscode.Uri.file(err.file) : uri;
    const range = buildRange(err);
    const diagnostic = new vscode.Diagnostic(
      range,
      err.message,
      vscode.DiagnosticSeverity.Error
    );
    diagnostic.source = `SaveFlow (${language})`;
    return { uri: targetUri, diagnostic };
  });

  // Group by file (errors may point to imported partials)
  const byFile = new Map<string, vscode.Diagnostic[]>();
  for (const { uri: errorUri, diagnostic } of diagnostics) {
    const key = errorUri.toString();
    if (!byFile.has(key)) {
      byFile.set(key, []);
    }
    byFile.get(key)!.push(diagnostic);
  }

  // Clear the source file's errors regardless
  collection.delete(uri);

  for (const [uriStr, diags] of byFile) {
    collection.set(vscode.Uri.parse(uriStr), diags);
  }
}

/**
 * Clears all diagnostics for the given file across all language collections.
 * Call this on successful compilation.
 */
export function clearErrors(filePath: string): void {
  const uri = vscode.Uri.file(filePath);
  for (const collection of collections.values()) {
    collection.delete(uri);
  }
}

/**
 * Disposes all DiagnosticCollections.
 * Call from extension deactivate() if needed.
 */
export function disposeAll(): void {
  for (const collection of collections.values()) {
    collection.dispose();
  }
  collections.clear();
}

// ─── Private ────────────────────────────────────────────────────────────────

/** Gets or creates a DiagnosticCollection for the given language. */
function getCollection(language: string): vscode.DiagnosticCollection {
  if (!collections.has(language)) {
    collections.set(
      language,
      vscode.languages.createDiagnosticCollection(`saveflow-${language}`)
    );
  }
  return collections.get(language)!;
}

/** Converts a CompilerError location to a VS Code Range. */
function buildRange(err: CompilerError): vscode.Range {
  if (err.line !== undefined) {
    const line = Math.max(0, err.line - 1); // VS Code is 0-based
    const col = err.column !== undefined ? Math.max(0, err.column - 1) : 0;
    return new vscode.Range(line, col, line, col + 80);
  }
  // No location info — highlight line 0
  return new vscode.Range(0, 0, 0, 0);
}
