# SaveFlow — Sprint Log

## Sprint 1 — ✅ COMPLETE
Full extension scaffold, all compilers, build clean, F5 working.

## Sprint 2 — ✅ COMPLETE
SCSS partial watch, file watchers, Less/Stylus verified. All 9 tests passing.

## Sprint 3 — ✅ COMPLETE
README, CHANGELOG, Medium article draft (2,500+ words), .vscodeignore verified.

## Sprint 4 — ✅ COMPLETE
Pro tier: LemonSqueezy wired, TypeScript compiler (respects tsconfig.json), Pro gate,
Tests 10–16 passing. Bundle: 7.0MB.

## Sprint 5 — ✅ COMPLETE
Icon sizes (6 variants), Settings UI panel (Pro-gated), SCSS source maps, LICENSE,
.vscodeignore cleaned, VSIX packaged: 18 files, 5.86MB.

### Remaining — Manual
- [ ] `vsce publish` — requires marketplace credentials
- [ ] Medium article — review docs/medium-article-draft.md and publish
- [ ] Announce on r/vscode, r/webdev, relevant Discord communities

---

## Sprint 6 — ✅ COMPLETE
**Goal:** Verify LemonSqueezy integration against live product data

### Live IDs (confirmed via LemonSqueezy MCP)

| Item | Value |
|---|---|
| Store | Gingerturtle (179829) |
| Product | SaveFlow Pro (963990) |
| Annual variant | 1513828 |
| Lifetime variant | 1513832 |
| Annual checkout | https://gingerturtle.lemonsqueezy.com/checkout/buy/97267f1f-0dd6-4d84-8dcc-43e587030340 |
| Lifetime checkout | https://gingerturtle.lemonsqueezy.com/checkout/buy/39df352c-cc94-4b58-89de-5323df261f6f |

### Bugs Fixed
| Severity | File | Fix |
|---|---|---|
| **CRITICAL** | `licenceValidator.ts` | Activation success was based on `response.ok` — now correctly checks `activated === true` |
| **HIGH** | `licenceValidator.ts`, `settings.html`, `settingsPanel.ts`, `README.md` | All placeholder/non-checkout URLs replaced with real LemonSqueezy checkout URLs |

### Non-blocking Notes (post-launch backlog)
- LemonSqueezy has an extra pending "Default" variant (ID: 1513833) — do not expose this; delete it in LemonSqueezy dashboard when convenient
- No deactivation flow implemented — users cannot transfer licence to a new machine without contacting support. Add `POST /v1/licenses/deactivate` call on extension uninstall in a post-launch patch.

### Verification Evidence
- `tsc --noEmit` → no errors ✅
- `npm run build` → `out/extension.js` 7.0MB in 2536ms ✅
- CLAUDE.md updated with LemonSqueezy IDs table ✅

---

## Post-Launch Backlog (prioritised)

### P0 — Housekeeping (do now)
- [ ] **Delete Default variant 1513833** in LemonSqueezy dashboard
- [ ] **Push assets/ to GitHub** — screenshots must be committed so marketplace images load

### P1 — Tier 1 features (highest impact, build next sprint)

#### Status bar indicator (Free)
- [ ] Add `vscode.StatusBarItem` showing compile state: idle / compiling / error count
- [ ] Idle: `$(check) SaveFlow` — click opens Output channel
- [ ] Compiling: `$(sync~spin) Compiling...`
- [ ] Error: `$(error) 2 errors` in red — click opens Problems panel
- [ ] This is the #1 visual trust signal missing vs Live Sass Compiler
- [ ] File: new `src/lib/statusBar.ts`, wired into `extension.ts`

#### Autoprefixer — basic (Free) + configurable (Pro)
- [ ] `npm install autoprefixer postcss` as runtime dependency
- [ ] Post-process compiled CSS through autoprefixer before writing output file
- [ ] Free tier: always uses `defaults` browserslist (covers 90%+ of use cases)
- [ ] New free setting: `saveflow.autoprefixer.enabled` (boolean, default: false)
- [ ] Pro setting: `saveflow.autoprefixer.browserslist` (string array, e.g. `["last 2 versions"]`)
- [ ] Pro setting: `saveflow.autoprefixer.readFromPackageJson` (boolean) — reads
      `browserslist` field from workspace `package.json` automatically
- [ ] File: new `src/lib/autoprefixer.ts` wrapper
- [ ] This is the #1 feature gap vs Live Sass Compiler

#### Compile Hero migration command (Free)
- [ ] New command: `SaveFlow: Import Compile Hero Settings`
- [ ] Reads all `compile-hero.*` workspace settings
- [ ] Maps them to `saveflow.*` equivalents (see migration table in README)
- [ ] Shows a preview diff in a QuickPick or information message
- [ ] Applies settings to `.vscode/settings.json` on user confirmation
- [ ] Removes `compile-hero.*` keys if user opts in
- [ ] This is the single highest-leverage growth feature — removes all friction for
      the 216k Compile Hero users
- [ ] File: new `src/commands/importCompileHero.ts`

#### Right-click compile folder (Free)
- [ ] Register a `menus` contribution in `package.json` → `explorer/context`
- [ ] Command: `SaveFlow: Compile All Files in Folder`
- [ ] Walks the folder recursively, finds all supported source files (not partials)
- [ ] Compiles each — reports summary in Output channel: "Compiled 12 files, 0 errors"
- [ ] Filters by `saveflow.ignore` globs
- [ ] File: new `src/commands/compileFolder.ts`

### P2 — Tier 2 Pro features (conversion drivers)

#### Build profiles (Pro) ← biggest Pro differentiator
- [ ] Named compile configurations stored in `.vscode/saveflow-profiles.json`
- [ ] Each profile specifies: minify, sourceMaps, outputDirectory per language
- [ ] Two built-in profiles: `dev` (expanded, source maps) and `prod` (minified, no maps)
- [ ] Switch via status bar click (Pro users) or Command Palette: `SaveFlow: Switch Profile`
- [ ] Free users see profile names in status bar but switching prompts Pro upgrade
- [ ] This feature has no equivalent in any competitor
- [ ] File: `src/lib/profiles.ts` + `src/panels/` updates

#### Compile on open (Pro)
- [ ] When a supported file is opened (`workspace.onDidOpenTextDocument`), compile it
- [ ] Gated behind `isProActivated()` — free users get on-save only
- [ ] New Pro setting: `saveflow.compileOnOpen` (boolean, default: false)
- [ ] Useful for teams where other members or tooling modifies source files

#### Licence deactivation (Pro)
- [ ] Call `POST /v1/licenses/deactivate` when user runs `SaveFlow: Deactivate Pro`
- [ ] Allows licence transfer to a new machine without support ticket
- [ ] File: `src/lib/licenceValidator.ts` extension + new command

### P3 — Do not build yet
- **Watch mode** — contradicts SaveFlow's zero-CPU positioning; reintroduces CPU problem
- **Multi-machine licences** — wait for demand signal at 500+ Pro users
- **OVSX publish** — 5 minutes when ready, not a feature

---

## Decisions Log

| Date | Decision | Reason |
|---|---|---|
| Apr 2026 | Dart Sass (`sass` npm) over `node-sass` | `node-sass` deprecated; Dart Sass is official |
| Apr 2026 | Default import for `less` and `stylus` | Both use CommonJS default export |
| Apr 2026 | Extension host process, not child_process | Simpler for v1 |
| Apr 2026 | VS Code DiagnosticCollection for errors | Integrates with Problems panel; no toast noise |
| Apr 2026 | LemonSqueezy for Pro monetisation | Consistent with BC Client Navigator + Ginger Turtle portfolio |
| Apr 2026 | TypeScript as Pro gate | Most natural upsell trigger |
| Apr 2026 | File watcher on create/delete for import graph | Graph must stay live during session |
| Apr 2026 | `init()` pattern for ExtensionContext in licenceValidator | Avoids prop-drilling |
| Apr 2026 | `sharp` for icon resizing | Lightweight, Node-native |
| Apr 2026 | WebviewPanel for Settings UI | Native VS Code pattern for Pro settings form |
| Apr 2026 | LemonSqueezy MCP verification skill | Claude Code retrieves live IDs and self-verifies — no manual ID hunting |
| Apr 2026 | Check `activated === true` not `response.ok` | LemonSqueezy returns 200 with `activated: false` on invalid keys |
