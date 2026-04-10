import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * In-memory import graph.
 * Key: absolute path of a file
 * Value: Set of absolute paths that this file directly imports
 */
const importGraph = new Map<string, Set<string>>();

/** Whether the graph has been fully built for the workspace. */
let graphBuilt = false;

/**
 * Returns true if the given SCSS basename is a partial.
 * Partials start with an underscore: _variables.scss
 */
export function isPartial(basename: string): boolean {
  return basename.startsWith('_');
}

/**
 * Returns all root (non-partial) SCSS files that transitively
 * import the given partial file. These are the files that need
 * to be recompiled when the partial is saved.
 */
export async function resolveRootFiles(partialPath: string): Promise<string[]> {
  await ensureGraphBuilt();

  const roots: string[] = [];
  const allScssFiles = [...importGraph.keys()];

  for (const file of allScssFiles) {
    const basename = path.basename(file, path.extname(file));
    if (isPartial(basename)) {
      continue; // Skip other partials as roots
    }
    if (transitivelyImports(file, partialPath, new Set())) {
      roots.push(file);
    }
  }

  return roots;
}

/**
 * Invalidates the graph entry for a specific file.
 * Call when a file is created, deleted, or renamed.
 */
export function invalidateFile(filePath: string): void {
  importGraph.delete(filePath);
}

/**
 * Fully resets the graph. Call if the workspace changes significantly.
 */
export function resetGraph(): void {
  importGraph.clear();
  graphBuilt = false;
}

// ─── Private ────────────────────────────────────────────────────────────────

/** Ensures the graph has been built by scanning the workspace. */
async function ensureGraphBuilt(): Promise<void> {
  if (graphBuilt) {
    return;
  }

  const scssFiles = await vscode.workspace.findFiles(
    '**/*.{scss,sass}',
    '**/node_modules/**'
  );

  await Promise.all(scssFiles.map(uri => buildGraphEntry(uri.fsPath)));
  graphBuilt = true;
}

/** Parses a single SCSS file and records its imports in the graph. */
async function buildGraphEntry(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const imports = parseImports(content, filePath);
    importGraph.set(filePath, new Set(imports));
  } catch {
    // File may have been deleted — skip it
    importGraph.delete(filePath);
  }
}

/**
 * Parses @use, @forward, and @import statements from SCSS source,
 * returning absolute paths of the imported files.
 */
function parseImports(content: string, sourceFile: string): string[] {
  const dir = path.dirname(sourceFile);
  const results: string[] = [];

  // Match @use 'path', @forward 'path', @import 'path' (single or double quotes)
  const importRegex = /@(?:use|forward|import)\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];

    // Skip CSS imports and URLs
    if (importPath.endsWith('.css') || importPath.startsWith('http')) {
      continue;
    }

    const resolved = resolveScssImport(importPath, dir);
    if (resolved) {
      results.push(resolved);
    }
  }

  return results;
}

/**
 * Resolves an SCSS import path to an absolute file path.
 * Handles: partials (adds _ prefix), index files, .scss/.sass extensions.
 */
function resolveScssImport(importPath: string, fromDir: string): string | null {
  const candidates = generateCandidatePaths(importPath, fromDir);

  for (const candidate of candidates) {
    try {
      // Synchronous check is acceptable here — called only during graph build
      require('fs').accessSync(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

/** Generates all candidate file paths for an SCSS import statement. */
function generateCandidatePaths(importPath: string, fromDir: string): string[] {
  const base = path.resolve(fromDir, importPath);
  const dir = path.dirname(base);
  const name = path.basename(base);

  const candidates: string[] = [];

  for (const ext of ['.scss', '.sass']) {
    // Direct: path.scss
    candidates.push(`${base}${ext}`);
    // Partial: _path.scss
    candidates.push(path.join(dir, `_${name}${ext}`));
    // Index: path/index.scss
    candidates.push(path.join(base, `index${ext}`));
    // Partial index: path/_index.scss
    candidates.push(path.join(base, `_index${ext}`));
  }

  // Also try if extension already provided
  candidates.push(base);

  return candidates;
}

/** Recursively checks if `file` imports `target` (directly or transitively). */
function transitivelyImports(
  file: string,
  target: string,
  visited: Set<string>
): boolean {
  if (visited.has(file)) {
    return false; // Circular import guard
  }
  visited.add(file);

  const imports = importGraph.get(file);
  if (!imports) {
    return false;
  }

  if (imports.has(target)) {
    return true;
  }

  for (const imported of imports) {
    if (transitivelyImports(imported, target, visited)) {
      return true;
    }
  }

  return false;
}
