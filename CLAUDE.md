# SaveFlow — Claude Code Project Context

## What This Is
SaveFlow is a VS Code extension that compiles front-end source files (SCSS, Less, Stylus,
TypeScript) on save — without requiring a build task or terminal. It is the maintained,
professional replacement for the abandoned "Compile Hero" extension (216k installs, 3.9★).

Publisher: Ginger Turtle | Author: Renni
GitHub: https://github.com/Goldenvikingsunset/saveflow
Target store: VS Code Marketplace
Monetisation: Free tier (SCSS/Less/Stylus) + Pro tier via LemonSqueezy (TypeScript, config UI)
Pro price: £4.99/yr or £14.99 lifetime

---

## Repository Structure

```
saveflow/
├── CLAUDE.md                   ← you are here
├── sprint-log.md               ← current sprint, decisions, what was done
├── package.json                ← VS Code extension manifest (publisher: ginger-turtle)
├── tsconfig.json
├── .vscodeignore
├── .vscode/
│   ├── launch.json             ← F5 debug config
│   └── extensions.json
├── src/
│   ├── extension.ts            ← activate / deactivate entry point
│   ├── compilers/
│   │   ├── base.ts             ← CompilerResult type + abstract base
│   │   ├── scss.ts             ← Dart Sass wrapper
│   │   ├── less.ts             ← Less wrapper
│   │   ├── stylus.ts           ← Stylus wrapper
│   │   └── typescript.ts       ← TS compiler (Pro only)
│   └── lib/
│       ├── importGraph.ts      ← SCSS partial dependency graph
│       ├── licenceValidator.ts ← LemonSqueezy Pro key validation
│       ├── outputResolver.ts   ← Determines output file path from settings
│       ├── problemReporter.ts  ← Maps compiler errors → VS Code diagnostics
│       └── config.ts           ← Typed settings accessors
└── .claude/
    ├── agents/
    │   ├── scss-specialist.md
    │   ├── ts-compiler.md
    │   └── code-reviewer.md
    └── skills/
        ├── new-language.md
        └── pro-gate.md
```

---

## Architecture Rules — READ BEFORE CODING

### Activation
- Extension activates ONLY when a supported file type is opened (`onLanguage:` events)
- Never use `*` activation — this was the root cause of Compile Hero's CPU bug
- Do NOT use polling. Use VS Code's `workspace.onDidSaveTextDocument` event only

### Compiler Execution
- Each compiler (scss, less, stylus, ts) is a thin wrapper around its npm package
- Compilers run in the extension host process (not a child process for v1)
- Each compiler MUST return `CompilerResult` — never throw, always catch and return error state

### Output Path Resolution
- Default: same directory as source file, same name, `.css` / `.js` extension
- Configurable via `saveflow.<language>.outputDirectory` workspace setting
- Logic lives exclusively in `outputResolver.ts` — nowhere else

### Error Handling
- Successful compile: NO notification, NO status bar flash. Silent.
- Failed compile: Use VS Code `DiagnosticCollection` to show errors inline in the Problems panel
- Include: file path, line number, column, compiler error message
- NEVER use `vscode.window.showErrorMessage` for compile errors

### Pro Gating
- Call `isProActivated()` from `licenceValidator.ts` before any Pro feature
- If not activated: show one-time prompt with "Activate Pro" button — not a nag on every save
- TypeScript compiler is Pro. Settings UI panel is Pro. Source maps are Pro.
- Licence key stored in `vscode.SecretStorage` — never in `workspace.getConfiguration()`

### SCSS Partial Graph
- Partials are files whose name starts with `_`
- On first save of any SCSS file, build the import graph for the workspace
- When a partial is saved, find all root files (non-partial) that transitively import it
- Recompile those root files, not the partial itself
- Graph lives in memory; invalidate entry when a file is created/deleted/renamed

### Coding Conventions
- TypeScript strict mode
- No `any` — use `unknown` and narrow
- Functions max 60 lines — split if longer
- One responsibility per file
- All exported functions must have a JSDoc comment
- Prefer `const` over `let`; never `var`

---

## Settings Reference

| Setting | Type | Default | Tier |
|---|---|---|---|
| `saveflow.scss.enabled` | boolean | true | Free |
| `saveflow.scss.outputDirectory` | string | "" (same dir) | Free |
| `saveflow.scss.minify` | boolean | false | Free |
| `saveflow.less.enabled` | boolean | true | Free |
| `saveflow.less.outputDirectory` | string | "" | Free |
| `saveflow.less.minify` | boolean | false | Free |
| `saveflow.stylus.enabled` | boolean | true | Free |
| `saveflow.stylus.outputDirectory` | string | "" | Free |
| `saveflow.typescript.enabled` | boolean | false | **Pro** |
| `saveflow.typescript.outputDirectory` | string | "" | **Pro** |
| `saveflow.typescript.sourceMaps` | boolean | false | **Pro** |
| `saveflow.ignore` | string[] | [] | Free |

---

## LemonSqueezy Integration

- Product: SaveFlow Pro (under Ginger Turtle store)
- Variants: Annual (£4.99) and Lifetime (£14.99)
- Activation endpoint: `https://api.lemonsqueezy.com/v1/licenses/activate`
- Key entry: Command Palette → "SaveFlow: Activate Pro"
- Cache: validated status in `SecretStorage` with `saveflow.licenceStatus` key
- Offline grace: 7 days — check timestamp stored alongside status
- Re-validate: when the cached activation is older than the 7-day grace period

## LemonSqueezy Product IDs

| Item | ID / URL |
|---|---|
| Store ID | `179829` |
| Product ID (SaveFlow Pro) | `963990` |
| Variant ID — Annual (£4.99) | `1513828` |
| Variant ID — Lifetime (£14.99) | `1513832` |
| Annual Checkout URL | `https://gingerturtle.lemonsqueezy.com/checkout/buy/97267f1f-0dd6-4d84-8dcc-43e587030340` |
| Lifetime Checkout URL | `https://gingerturtle.lemonsqueezy.com/checkout/buy/39df352c-cc94-4b58-89de-5323df261f6f` |

---

## Current Sprint
See `sprint-log.md` for the active sprint and what was last worked on.

---

## Key Decisions Log

| Date | Decision | Reason |
|---|---|---|
| Apr 2026 | Dart Sass over node-sass | node-sass is deprecated; Dart Sass is the official compiler |
| Apr 2026 | Extension host process, not child_process | Simpler for v1; revisit if CPU becomes an issue |
| Apr 2026 | VS Code DiagnosticCollection for errors | Better UX than toasts; integrates with Problems panel |
| Apr 2026 | LemonSqueezy for Pro | Consistent with BC Client Navigator and rest of Ginger Turtle portfolio |
| Apr 2026 | TypeScript as Pro gate | Most common upsell trigger; SCSS/Less users get full free value |

---

## DO NOTs — Common Mistakes to Avoid

- DO NOT activate on `*` — lazy activation only
- DO NOT poll the file system — event-driven only
- DO NOT call `showErrorMessage` for compiler errors — use DiagnosticCollection
- DO NOT store the licence key in settings.json — SecretStorage only
- DO NOT compile `_partial.scss` files directly — only root files
- DO NOT bundle the TypeScript compiler in the free VSIX — lazy load on Pro activation
- DO NOT add `console.log` — use the extension's OutputChannel for debug logging
