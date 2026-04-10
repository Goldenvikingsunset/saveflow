---
name: add-new-language
description: Step-by-step playbook for adding a new compilation language to SaveFlow (e.g. Pug, Stylus v2, CoffeeScript). Follow every step in order.
---

# Skill: Adding a New Compilation Language

## Prerequisites
- You have read CLAUDE.md and understand the CompilerResult contract
- The npm package for the compiler is available and actively maintained
- The language has a VS Code language ID (check via `vscode.languages.getLanguages()`)

## Steps

### 1. Install the npm compiler package
```bash
npm install <compiler-package>
npm install --save-dev @types/<compiler-package>  # if types exist
```

### 2. Create the compiler wrapper
Create `src/compilers/<language>.ts`:
```typescript
import * as vscode from 'vscode';
import { CompilerResult } from './base';
import { resolveOutputPath } from '../lib/outputResolver';

/**
 * Compiles a <Language> file to CSS/JS.
 * @param filePath Absolute path to the source file
 * @param outputChannel Extension output channel for debug logging
 */
export async function compile<Language>(
  filePath: string,
  outputChannel: vscode.OutputChannel
): Promise<CompilerResult> {
  try {
    // 1. Read source
    // 2. Compile
    // 3. Return { success: true, css: '...', errors: [] }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`[<Language>] Error: ${message}`);
    return {
      success: false,
      errors: [{ message }]
    };
  }
}
```

### 3. Register the activation event in package.json
Add to `activationEvents`:
```json
"onLanguage:<vscode-language-id>"
```

Add to `contributes.configuration.properties`:
```json
"saveflow.<language>.enabled": {
  "type": "boolean",
  "default": true,
  "markdownDescription": "Enable <Language> compile on save."
},
"saveflow.<language>.outputDirectory": {
  "type": "string",
  "default": "",
  "markdownDescription": "Output directory for compiled files. Leave empty to output alongside source."
},
"saveflow.<language>.minify": {
  "type": "boolean",
  "default": false,
  "markdownDescription": "Minify compiled output."
}
```

### 4. Add settings accessor to config.ts
```typescript
export function get<Language>Config() {
  const cfg = vscode.workspace.getConfiguration('saveflow.<language>');
  return {
    enabled: cfg.get<boolean>('enabled', true),
    outputDirectory: cfg.get<string>('outputDirectory', ''),
    minify: cfg.get<boolean>('minify', false),
  };
}
```

### 5. Wire into extension.ts
In the `onDidSaveTextDocument` handler, add a case:
```typescript
case '<vscode-language-id>':
  if (get<Language>Config().enabled) {
    result = await compile<Language>(document.fileName, outputChannel);
  }
  break;
```

### 6. Update problemReporter.ts if the compiler has a unique error format
If the compiler's errors don't map cleanly to `{ message, file, line, column }`,
add a normalisation function in `problemReporter.ts`.

### 7. Test
- [ ] Compile a basic file — output appears in correct directory
- [ ] Introduce a syntax error — appears in Problems panel with correct line number
- [ ] Successful compile produces no notification
- [ ] Disabling via settings stops compilation

### 8. Update CLAUDE.md settings reference table
Add the new settings rows to the Settings Reference table.

### 9. Update sprint-log.md
Note the new language as completed in the current sprint.
