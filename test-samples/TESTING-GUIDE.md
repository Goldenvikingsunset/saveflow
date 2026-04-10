# SaveFlow — Testing Guide

## Sprints 2 + 4

## Setup

1. Press **F5** in VS Code to launch the Extension Development Host
2. In the new window, open the `test-samples` folder
3. Open the Output panel (View → Output) and select "SaveFlow" from the dropdown

---

## Test 1: SCSS Basic Compile ✓

**File:** `scss/main.scss`

**Steps:**
1. Open `scss/main.scss`
2. Make a small change (add a comment or extra space)
3. Save the file (Ctrl+S / Cmd+S)

**Expected:**
- `scss/main.css` appears alongside the source file
- Output channel shows: `[SCSS] Compiling:` followed by `[SCSS] OK:`
- NO notification toast appears
- Problems panel stays empty

---

## Test 2: SCSS Error Reporting ✓

**File:** `scss/error.scss`

**Steps:**
1. Open `scss/error.scss` (contains intentional syntax error)
2. Save the file

**Expected:**
- Problems panel shows 1 error for `error.scss`
- Error message: "expected ";"" or similar
- Error has correct file path, line number, and column
- NO notification toast appears
- Output channel shows: `[SCSS] Failed:` with error count

**Cleanup:**
- Fix the error by adding a semicolon after `color: #333`
- Save again — error should clear from Problems panel

---

## Test 3: SCSS Partial Watch ✓

**Files:** `scss/_variables.scss` and `scss/main.scss`

**Steps:**
1. Ensure `scss/main.css` exists (compile `main.scss` first if needed)
2. Note the current timestamp/content of `main.css`
3. Open `scss/_variables.scss`
4. Change `$primary-color` to a different value (e.g., `#e74c3c`)
5. Save `_variables.scss`

**Expected:**
- NO `_variables.css` file is created (partials don't compile directly)
- `main.css` is **recompiled** automatically
- `main.css` now contains the new color value
- Output channel shows: `[SCSS] Partial saved — recompiling 1 root file(s)`
- Output channel shows: `[SCSS] Compiling: ...main.scss`

---

## Test 4: Less Compile ✓

**File:** `less/styles.less`

**Steps:**
1. Open `less/styles.less`
2. Save the file

**Expected:**
- `less/styles.css` appears alongside source
- Output channel shows: `[Less] Compiling:` and `[Less] Written:`
- Problems panel stays empty

---

## Test 5: Stylus Compile ✓

**File:** `stylus/styles.styl`

**Steps:**
1. Open `stylus/styles.styl`
2. Save the file

**Expected:**
- `stylus/styles.css` appears alongside source
- Output channel shows: `[Stylus] Compiling:` and `[Stylus] Written:`
- Problems panel stays empty

---

## Test 6: Output Directory Setting ✓

**File:** `scss/main.scss`

**Steps:**
1. Open VS Code settings (Ctrl+, / Cmd+,)
2. Search for "saveflow scss output"
3. Set `Saveflow › Scss: Output Directory` to `./dist/css`
4. Save `scss/main.scss` again

**Expected:**
- `dist/css/main.css` is created (not `scss/main.css`)
- Output channel confirms: `[SCSS] Written: ...dist/css/main.css`

**Cleanup:**
- Delete the `dist` folder
- Clear the output directory setting (set back to empty string)
- Save `main.scss` again — output should return to `scss/main.css`

---

## Test 7: Ignore Globs ✓

**Steps:**
1. Create a new file: `scss/ignored.scss`
2. Add basic SCSS content: `body { color: red; }`
3. Save it — `ignored.css` should appear
4. Open VS Code settings
5. Search for "saveflow ignore"
6. Add `["**/ignored.*"]` to `Saveflow: Ignore` array
7. Modify and save `scss/ignored.scss` again

**Expected:**
- NO new compilation happens (no output logged)
- `ignored.css` is not updated
- Output channel shows nothing for the ignored file

**Cleanup:**
- Clear the ignore setting
- Delete `scss/ignored.scss` and `scss/ignored.css`

---

## Test 8: Minify Toggle ✓

**File:** `scss/main.scss`

**Steps:**
1. Open VS Code settings
2. Search for "saveflow scss minify"
3. Enable `Saveflow › Scss: Minify`
4. Save `scss/main.scss`

**Expected:**
- `main.css` is rewritten in compressed format (no whitespace, single line)
- Compare before/after file size — should be smaller

**Cleanup:**
- Disable minify setting
- Save `main.scss` again — output returns to expanded format

---

## Test 9: File System Watchers (Import Graph Sync) ✓

**Setup:**
1. Ensure the import graph is built (save any SCSS file)

**Test Create:**
1. Create a new file: `scss/_colors.scss`
2. Add content: `$red: #ff0000;`
3. Save it
4. Check Output channel — should log: `[ImportGraph] File created: ..._colors.scss`

**Test Delete:**
1. Delete `scss/_colors.scss` from the file explorer
2. Check Output channel — should log: `[ImportGraph] File deleted: ..._colors.scss`

**Expected:**
- Import graph invalidates the created/deleted file
- No errors in the extension host console

---

## Common Issues

### "Extension host terminated unexpectedly"
- Check the Debug Console for stack traces
- Likely cause: syntax error in TypeScript or missing dependency

### Compilation doesn't trigger
- Check language ID is correct (bottom-right of VS Code status bar)
- Ensure file has correct extension (`.scss`, `.less`, `.styl`)
- Check `saveflow.<lang>.enabled` is `true` in settings

### Partial watch not working
- Ensure `main.scss` uses `@use 'variables'` syntax (not old `@import`)
- Check Output channel for graph-building logs
- Try saving the root file first to build the graph

---

## Test 10: TypeScript Pro Gate (No Licence) ✓

**File:** `typescript/no-tsconfig/simple.ts`

**Steps:**
1. Ensure NO Pro licence is activated (fresh install state)
2. Open `typescript/no-tsconfig/simple.ts`
3. Make a small change and save

**Expected:**
- Information message appears: "SaveFlow Pro is required for TypeScript compilation"
- Message has "Activate Pro" and "Learn More" buttons
- NO compilation happens
- NO .js file is created

---

## Test 11: TypeScript Pro Activation (Mock Valid Key) ✓

**Steps:**
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run "SaveFlow: Activate Pro"
3. Enter test key: `SAVEFLOW-PRO-TEST-KEY` (mock valid for testing)
4. Wait for validation progress indicator

**Expected:**
- Progress notification: "Validating SaveFlow Pro licence…"
- Success message: "✅ SaveFlow Pro activated! TypeScript compilation and Pro features are now enabled."
- TypeScript compilation should now work

**Note:** For real testing, you'll need a valid LemonSqueezy key. For development, you can temporarily mock the validation in `licenceValidator.ts`.

---

## Test 12: TypeScript with tsconfig.json ✓

**File:** `typescript/with-tsconfig/app.ts`

**Prerequisites:** Pro licence activated (Test 11)

**Steps:**
1. Enable TypeScript in settings: `Saveflow › Typescript: Enabled` → `true`
2. Open `typescript/with-tsconfig/app.ts`
3. Save the file

**Expected:**
- `dist/app.js` is created (honoring tsconfig.json `outDir`)
- Output channel shows: `[TypeScript] Using tsconfig: ...tsconfig.json`
- Output channel shows: `[TypeScript] Written: ...dist/app.js`
- Compiled output uses ES2022 syntax and ESNext modules (as per tsconfig)
- Problems panel stays empty

---

## Test 13: TypeScript without tsconfig.json ✓

**File:** `typescript/no-tsconfig/simple.ts`

**Prerequisites:** Pro licence activated, TypeScript enabled

**Steps:**
1. Open `typescript/no-tsconfig/simple.ts`
2. Save the file

**Expected:**
- `simple.js` appears in the same directory (no tsconfig outDir)
- Output channel shows: `[TypeScript] No tsconfig.json found, using defaults`
- Output channel shows: `[TypeScript] Written: ...simple.js`
- Compiled output uses ES2020 target and CommonJS modules (default)
- Problems panel stays empty

---

## Test 14: TypeScript Error Reporting ✓

**File:** `typescript/no-tsconfig/error.ts`

**Prerequisites:** Pro licence activated, TypeScript enabled

**Steps:**
1. Open `typescript/no-tsconfig/error.ts` (contains type error: string assigned to number)
2. Save the file

**Expected:**
- Problems panel shows 1 error for `error.ts`
- Error message: "Type 'string' is not assignable to type 'number'" or similar
- Error has correct file path, line number (line 9), and column
- NO .js file is created (compilation failed)
- NO notification toast appears
- Output channel shows: `[TypeScript] Failed:` with error count

---

## Test 15: TSX (TypeScript React) Compilation ✓

**File:** `typescript/tsx-test/Component.tsx`

**Prerequisites:** Pro licence activated, TypeScript enabled

**Steps:**
1. Open `typescript/tsx-test/Component.tsx`
2. Save the file

**Expected:**
- `Component.js` appears alongside the source
- Output channel shows: `[TypeScript] Using tsconfig: ...tsx-test/tsconfig.json`
- Output channel shows: `[TypeScript] Written: ...Component.js`
- Compiled output contains `React.createElement()` calls (JSX transformed)
- Problems panel stays empty

---

## Test 16: TypeScript Source Maps ✓

**File:** `typescript/with-tsconfig/app.ts`

**Prerequisites:** Pro licence activated, TypeScript enabled

**Steps:**
1. Open VS Code settings
2. Search for "saveflow typescript source"
3. Enable `Saveflow › Typescript: Source Maps`
4. Save `typescript/with-tsconfig/app.ts`

**Expected:**
- `dist/app.js` is created/updated
- `dist/app.js.map` is also created
- Output channel shows: `[TypeScript] Source map: ...dist/app.js.map`
- Source map file contains valid JSON with `sources`, `mappings`, etc.

**Cleanup:**
- Disable source maps setting

---

## Common Issues (TypeScript)

### "SaveFlow Pro is required" prompt on every save
- The Pro gate only prompts once per session per feature
- If you see it repeatedly, check the session cache in `licenceValidator.ts`

### TypeScript compilation is slow
- Expected: TypeScript compiler API is slower than SCSS/Less (more work)
- Future optimization: incremental compilation (Sprint 5+)

### TSX files not recognized
- Ensure file has `.tsx` extension
- Check language ID in status bar (should be "typescriptreact")
- Ensure tsconfig.json has `"jsx": "react"` or similar

### Source maps not generated
- Check `config.sourceMaps` is true
- Check TypeScript version supports external source maps
- Look for emit errors in Problems panel

---

## Next Steps

Once all tests pass:
- ✅ Mark Sprint 2 complete in sprint-log.md
- ✅ Mark Sprint 4 complete in sprint-log.md
- ✅ Document any bugs found and fixed
- Move to Sprint 5 (Pro settings UI, source maps refinement, publish)
