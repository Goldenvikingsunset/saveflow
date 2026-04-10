import * as vscode from 'vscode';
import * as ts from 'typescript';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CompilerResult, ok, fail, CompilerError } from './base';
import { resolveOutputPath } from '../lib/outputResolver';
import { getTypescriptConfig } from '../lib/config';

/**
 * Compiles a TypeScript file to JavaScript using the TypeScript compiler API.
 * Never throws — returns CompilerResult on both success and failure.
 *
 * This function:
 * - Searches for tsconfig.json from the file's directory upward
 * - Respects tsconfig.json compiler options if found
 * - Falls back to sensible defaults (ES2020, CommonJS) if no config
 * - Emits to outputDirectory setting, tsconfig outDir, or source directory (in that order)
 * - Generates source maps if config.sourceMaps is true
 */
export async function compileTypescript(
  filePath: string,
  config: ReturnType<typeof getTypescriptConfig>,
  outputChannel: vscode.OutputChannel
): Promise<CompilerResult> {
  try {
    // Find tsconfig.json by searching upward from the file's directory
    const configPath = ts.findConfigFile(
      path.dirname(filePath),
      ts.sys.fileExists,
      'tsconfig.json'
    );

    let compilerOptions: ts.CompilerOptions;
    let tsconfigOutDir: string | undefined;

    if (configPath) {
      // Parse tsconfig.json
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      if (configFile.error) {
        return fail([mapTsDiagnostic(configFile.error)]);
      }

      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configPath)
      );

      if (parsedConfig.errors.length > 0) {
        return fail(parsedConfig.errors.map(mapTsDiagnostic));
      }

      compilerOptions = parsedConfig.options;
      tsconfigOutDir = compilerOptions.outDir;
      outputChannel.appendLine(`[TypeScript] Using tsconfig: ${configPath}`);
    } else {
      // No tsconfig.json found — use sensible defaults
      compilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        strict: false,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      };
      outputChannel.appendLine(`[TypeScript] No tsconfig.json found, using defaults`);
    }

    // Handle source maps setting
    if (config.sourceMaps) {
      compilerOptions.sourceMap = true;
      compilerOptions.inlineSources = false; // External .js.map files only
    } else {
      compilerOptions.sourceMap = false;
    }

    // Create a compiler host (minimal implementation)
    const host = ts.createCompilerHost(compilerOptions);

    // Create a program with the single file
    const program = ts.createProgram([filePath], compilerOptions, host);

    // Get diagnostics (type errors, etc.)
    const diagnostics = [
      ...program.getSyntacticDiagnostics(),
      ...program.getSemanticDiagnostics(),
    ];

    if (diagnostics.length > 0) {
      return fail(diagnostics.map(mapTsDiagnostic));
    }

    // Emit the compiled output
    let jsOutput: string | undefined;
    let sourceMapOutput: string | undefined;

    const emitResult = program.emit(undefined, (fileName, data) => {
      if (fileName.endsWith('.js')) {
        jsOutput = data;
      } else if (fileName.endsWith('.js.map')) {
        sourceMapOutput = data;
      }
    });

    // Check for emit diagnostics
    if (emitResult.diagnostics.length > 0) {
      return fail(emitResult.diagnostics.map(mapTsDiagnostic));
    }

    if (!jsOutput) {
      return fail([{
        message: 'TypeScript compilation produced no output',
        file: filePath,
      }]);
    }

    // Determine output path
    // Priority: 1) config.outputDirectory, 2) tsconfig outDir, 3) same directory as source
    let outputDir = config.outputDirectory;
    if (!outputDir && tsconfigOutDir) {
      outputDir = tsconfigOutDir;
    }

    const outputPath = resolveOutputPath(filePath, outputDir, '.js');
    await fs.writeFile(outputPath, jsOutput, 'utf8');
    outputChannel.appendLine(`[TypeScript] Written: ${outputPath}`);

    // Write source map if generated
    if (sourceMapOutput) {
      const sourceMapPath = `${outputPath}.map`;
      await fs.writeFile(sourceMapPath, sourceMapOutput, 'utf8');
      outputChannel.appendLine(`[TypeScript] Source map: ${sourceMapPath}`);
    }

    return ok(jsOutput, sourceMapOutput);
  } catch (err: unknown) {
    return mapGenericError(err, filePath);
  }
}

/** Maps a TypeScript diagnostic to our CompilerError format. */
function mapTsDiagnostic(diagnostic: ts.Diagnostic): CompilerError {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

  if (diagnostic.file && diagnostic.start !== undefined) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return {
      message,
      file: diagnostic.file.fileName,
      line: line + 1, // TypeScript uses 0-based, we use 1-based
      column: character + 1,
    };
  }

  return { message };
}

/** Maps a generic error to our CompilerError format. */
function mapGenericError(err: unknown, fallbackFile: string): CompilerResult {
  const message = err instanceof Error ? err.message : String(err);
  return fail([{ message, file: fallbackFile }]);
}
