/** The result returned by every compiler. Never throw — always return this. */
export interface CompilerResult {
  success: boolean;
  /** Compiled CSS/JS output string. Present on success. */
  css?: string;
  /** Source map string. Present on success when source maps are requested. */
  sourceMap?: string;
  /** Compilation errors. Empty array on success. */
  errors: CompilerError[];
}

/** A single compilation error with optional location information. */
export interface CompilerError {
  message: string;
  /** Absolute path to the file containing the error. */
  file?: string;
  /** 1-based line number. */
  line?: number;
  /** 1-based column number. */
  column?: number;
}

/** Convenience factory for a successful result. */
export function ok(css: string, sourceMap?: string): CompilerResult {
  return { success: true, css, sourceMap, errors: [] };
}

/** Convenience factory for a failed result. */
export function fail(errors: CompilerError[]): CompilerResult {
  return { success: false, errors };
}
