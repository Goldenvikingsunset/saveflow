import * as vscode from 'vscode';
import * as sass from 'sass';
import * as fs from 'fs/promises';
import { CompilerResult, ok, fail } from './base';
import { resolveOutputPath } from '../lib/outputResolver';
import { getScssConfig } from '../lib/config';

/**
 * Compiles an SCSS/Sass file to CSS using Dart Sass.
 * Never throws — returns CompilerResult on both success and failure.
 */
export async function compileScss(
  filePath: string,
  config: ReturnType<typeof getScssConfig>,
  outputChannel: vscode.OutputChannel
): Promise<CompilerResult> {
  try {
    const result = sass.compile(filePath, {
      style: config.minify ? 'compressed' : 'expanded',
      sourceMap: config.sourceMaps,
      // Dart Sass honours @use and @forward natively
    });

    const outputPath = resolveOutputPath(filePath, config.outputDirectory, '.css');
    await fs.writeFile(outputPath, result.css, 'utf8');
    outputChannel.appendLine(`[SCSS] Written: ${outputPath}`);

    // Write source map if enabled
    if (config.sourceMaps && result.sourceMap) {
      const mapPath = `${outputPath}.map`;
      await fs.writeFile(mapPath, JSON.stringify(result.sourceMap), 'utf8');
      outputChannel.appendLine(`[SCSS] Source map written: ${mapPath}`);
    }

    return ok(result.css);
  } catch (err: unknown) {
    return mapSassError(err, filePath);
  }
}

/** Maps a Dart Sass error to our CompilerError format. */
function mapSassError(err: unknown, fallbackFile: string): CompilerResult {
  if (isSassException(err)) {
    return fail([{
      message: err.message,
      file: err.span?.url?.pathname ?? fallbackFile,
      line: err.span?.start.line !== undefined ? err.span.start.line + 1 : undefined,
      column: err.span?.start.column !== undefined ? err.span.start.column + 1 : undefined,
    }]);
  }

  const message = err instanceof Error ? err.message : String(err);
  return fail([{ message, file: fallbackFile }]);
}

/** Type guard for Dart Sass exceptions. */
function isSassException(err: unknown): err is sass.Exception {
  return err instanceof Error && 'span' in err;
}
