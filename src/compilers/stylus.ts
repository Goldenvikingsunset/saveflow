import * as vscode from 'vscode';
import stylus from 'stylus';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CompilerResult, ok, fail } from './base';
import { resolveOutputPath } from '../lib/outputResolver';
import { getStylusConfig } from '../lib/config';

/**
 * Compiles a Stylus file to CSS.
 * Never throws — returns CompilerResult on both success and failure.
 */
export async function compileStylus(
  filePath: string,
  config: ReturnType<typeof getStylusConfig>,
  outputChannel: vscode.OutputChannel
): Promise<CompilerResult> {
  try {
    const source = await fs.readFile(filePath, 'utf8');

    const css = await new Promise<string>((resolve, reject) => {
      stylus(source)
        .set('filename', filePath)
        .set('paths', [path.dirname(filePath)])
        .set('compress', config.minify)
        .render((err: Error | undefined, css: string | undefined) => {
          if (err) {
            reject(err);
          } else {
            resolve(css ?? '');
          }
        });
    });

    const outputPath = resolveOutputPath(filePath, config.outputDirectory, '.css');
    await fs.writeFile(outputPath, css, 'utf8');
    outputChannel.appendLine(`[Stylus] Written: ${outputPath}`);

    return ok(css);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fail([{ message, file: filePath }]);
  }
}
