import * as path from 'path';
import * as vscode from 'vscode';
import micromatch from 'micromatch';
import { getIgnoreGlobs } from './config';

/**
 * Resolves the output file path for a compiled source file.
 * If outputDirectory is empty, outputs alongside the source file.
 * If outputDirectory is a relative path, resolves from workspace root.
 * If outputDirectory is absolute, uses it directly.
 */
export function resolveOutputPath(
  sourceFilePath: string,
  outputDirectory: string,
  outputExtension: string
): string {
  const sourceDir = path.dirname(sourceFilePath);
  const baseName = path.basename(sourceFilePath, path.extname(sourceFilePath));
  const outputFileName = `${baseName}${outputExtension}`;

  if (!outputDirectory) {
    // Default: same directory as source
    return path.join(sourceDir, outputFileName);
  }

  if (path.isAbsolute(outputDirectory)) {
    return path.join(outputDirectory, outputFileName);
  }

  // Relative path — resolve from workspace root
  const workspaceRoot = getWorkspaceRoot();
  if (workspaceRoot) {
    return path.join(workspaceRoot, outputDirectory, outputFileName);
  }

  // Fallback: resolve relative to source directory
  return path.join(sourceDir, outputDirectory, outputFileName);
}

/**
 * Returns true if the given file path matches any of the saveflow.ignore globs.
 */
export function isIgnored(filePath: string): boolean {
  const globs = getIgnoreGlobs();
  if (globs.length === 0) {
    return false;
  }

  // Normalise to forward slashes for micromatch
  const normalised = filePath.replace(/\\/g, '/');
  return micromatch.isMatch(normalised, globs);
}

/** Returns the first workspace folder root path, or undefined if none open. */
function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
}
