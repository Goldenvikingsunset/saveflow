import * as vscode from 'vscode';
import less from 'less';
import * as fs from 'fs/promises';
import { CompilerResult, ok, fail } from './base';
import { resolveOutputPath } from '../lib/outputResolver';
import { getLessConfig } from '../lib/config';

/**
 * Compiles a Less file to CSS.
 * Never throws — returns CompilerResult on both success and failure.
 */
export async function compileLess(
  filePath: string,
  config: ReturnType<typeof getLessConfig>,
  outputChannel: vscode.OutputChannel
): Promise<CompilerResult> {
  try {
    const source = await fs.readFile(filePath, 'utf8');
    const result = await less.render(source, {
      filename: filePath,
      compress: config.minify,
      paths: [require('path').dirname(filePath)],
    });

    const outputPath = resolveOutputPath(filePath, config.outputDirectory, '.css');
    await fs.writeFile(outputPath, result.css, 'utf8');
    outputChannel.appendLine(`[Less] Written: ${outputPath}`);

    return ok(result.css);
  } catch (err: unknown) {
    return mapLessError(err, filePath);
  }
}

/** Maps a Less render error to our CompilerError format. */
function mapLessError(err: unknown, fallbackFile: string): CompilerResult {
  // Less errors have filename, line, column properties
  if (typeof err === 'object' && err !== null && 'filename' in err) {
    const lessErr = err as {
      message: string;
      filename?: string;
      line?: number;
      column?: number;
    };
    return fail([{
      message: lessErr.message,
      file: lessErr.filename ?? fallbackFile,
      line: lessErr.line,
      column: lessErr.column,
    }]);
  }

  const message = err instanceof Error ? err.message : String(err);
  return fail([{ message, file: fallbackFile }]);
}
