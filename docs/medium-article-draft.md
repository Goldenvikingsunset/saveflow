# I Fixed Every Bug in Compile Hero and Built a Better VS Code Extension

**How a 216,000-install extension with a 3.9-star rating became the blueprint for SaveFlow**

---

## The Problem

If you've used VS Code for front-end development, you've probably heard of [**Compile Hero**](https://marketplace.visualstudio.com/items?itemName=Wscats.compile-hero). It's a simple premise: compile SCSS, Less, Stylus, and TypeScript files on save — no build config, no terminal, no fuss. Just save your `.scss` file and get a `.css` file.

216,000 developers installed it. It had a 3.9-star rating. And then it was abandoned in 2021.

I was one of those 216,000. I used Compile Hero on every project for years. But over time, three things became impossible to ignore:

1. **SCSS partials didn't work.** Saving `_variables.scss` did nothing. You had to manually recompile parent files. Every. Single. Time.
2. **It destroyed my CPU.** Opening a large project would spike CPU to 100% for 30+ seconds.
3. **TypeScript output ignored my `tsconfig.json`.** The extension hardcoded compiler options, so my carefully tuned paths and target settings were useless.

The [GitHub reviews](https://marketplace.visualstudio.com/items?itemName=Wscats.compile-hero&ssr=false#review-details) tell the story:

> _"SCSS partial watching doesn't work. It's the whole reason I installed this."_ — 2 stars
> _"CPU usage is insane on large workspaces."_ — 1 star
> _"tsconfig.json is completely ignored. What's the point?"_ — 2 stars

The maintainers didn't respond. The repo went quiet. And 216,000 developers were stuck with a broken tool.

So I built a replacement. I called it **SaveFlow**.

---

## What the Reviews Actually Say

Before writing a single line of code, I read every 1-star and 2-star review of Compile Hero. Here's what broke:

### 1. SCSS Partial Watch

**The #1 requested feature.**

SCSS files starting with `_` are called **partials** — they're imported into other SCSS files but never compiled directly. When you save `_variables.scss`, you want the files that import it (like `main.scss`) to automatically recompile.

Compile Hero didn't do this. Saving a partial did nothing. You had to open `main.scss`, make a fake edit, and save it manually.

This was the most common complaint in the reviews — and the reason I started this project.

### 2. CPU Usage Spikes

**Caused by activation event misconfiguration.**

Compile Hero used the `*` activation event in its `package.json`. This tells VS Code to activate the extension **immediately on startup** — before you open any files.

The extension would scan the entire workspace for SCSS/Less/Stylus files, build an index, and set up watchers. On a 10,000-file project, this took 30+ seconds and pegged CPU at 100%.

The fix is simple: use **lazy activation events** like `onLanguage:scss`. This activates the extension only when you open an SCSS file. Zero CPU until you actually need it.

### 3. TypeScript Config Ignored

**Hardcoded compiler options.**

Compile Hero compiled TypeScript with hardcoded settings:
```typescript
{
  target: 'ES5',
  module: 'CommonJS',
  // ... etc
}
```

If your `tsconfig.json` specified `target: 'ES2020'` or used path mappings, Compile Hero ignored it. The output was incompatible with your project.

This is a dealbreaker for any TypeScript project. You can't ship an ES5 file when your codebase is ES2020.

---

## The SCSS Partial Import Graph — How It Works

The hardest part of building SaveFlow was solving the partial watch problem. Here's how it works.

### The Data Structure

When you save an SCSS file for the first time, SaveFlow scans the workspace and builds an **import graph** — a map of which files import which other files.

```typescript
// Simplified version of importGraph.ts
const graph = new Map<string, Set<string>>();
// Key: file path
// Value: set of files that THIS file imports

graph.set('/project/main.scss', new Set([
  '/project/_variables.scss',
  '/project/_mixins.scss'
]));

graph.set('/project/_mixins.scss', new Set([
  '/project/_variables.scss'
]));
```

The graph is **transitive** — if `main.scss` imports `_mixins.scss`, and `_mixins.scss` imports `_variables.scss`, then the graph knows that `main.scss` depends on `_variables.scss` even if there's no direct import.

### The Recompilation Algorithm

When you save `_variables.scss`:

1. **Is it a partial?** Check if filename starts with `_`. If yes, continue.
2. **Find all parents.** Walk the graph backwards to find every **root file** (non-partial) that transitively imports `_variables.scss`.
3. **Recompile parents.** Run the SCSS compiler on each parent file.

```typescript
function findRootParents(partial: string): string[] {
  const roots: string[] = [];

  for (const [file, imports] of graph.entries()) {
    if (file.startsWith('_')) continue; // Skip other partials
    if (transitivelyImports(file, partial)) {
      roots.push(file);
    }
  }

  return roots;
}
```

This is **exactly** what Compile Hero failed to implement. SaveFlow ships it in the free tier.

### Handling File Changes

The import graph must stay valid as files are created, deleted, or renamed. SaveFlow listens to VS Code's file system events:

```typescript
vscode.workspace.onDidCreateFiles(event => {
  for (const uri of event.files) {
    invalidateFile(uri.fsPath);
  }
});

vscode.workspace.onDidDeleteFiles(event => {
  for (const uri of event.files) {
    invalidateFile(uri.fsPath);
  }
});
```

`invalidateFile()` removes the file from the graph and forces a rebuild on the next save.

---

## Zero-CPU Design: Why Activation Events Matter

VS Code extensions can activate in two ways:

1. **`*` (immediate)** — activate on startup, before any files are opened
2. **`onLanguage:<id>`** — activate only when a file of that language is opened

Compile Hero used `*`. SaveFlow uses `onLanguage:scss`, `onLanguage:less`, etc.

### Why This Matters

When you open VS Code, the extension host process starts. If your extension uses `*` activation, it runs **immediately** — even if the user never opens an SCSS file.

Compile Hero would:
- Scan the entire workspace for SCSS/Less/Stylus files
- Parse `@import` statements to build a dependency graph
- Set up file watchers on thousands of files

On a large project, this took 30+ seconds and spiked CPU to 100%.

SaveFlow does none of this on startup. It activates when you open an SCSS file, builds the import graph **only for the workspace containing that file**, and uses VS Code's built-in file watcher APIs instead of polling.

Result: **zero CPU until you actually need the extension.**

---

## Introducing SaveFlow

SaveFlow is the maintained, CPU-safe replacement for Compile Hero. It fixes all three bugs and adds features Compile Hero never shipped.

### Free Tier

- **SCSS/Sass compile on save** — full Dart Sass support (`@use`, `@forward`, modern syntax)
- **SCSS partial watch** — import graph tracking with transitive parent recompilation
- **Less compile on save** — full Less.js v4 support
- **Stylus compile on save** — full Stylus support
- **Minify toggle** — per-language minification (`saveflow.scss.minify`)
- **Output directory routing** — configurable per language (`saveflow.scss.outputDirectory`)
- **Ignore globs** — exclude files from compilation (`saveflow.ignore`)

### Pro Tier (£4.99/year or £14.99 lifetime)

- **TypeScript compile on save** — honours your `tsconfig.json` (paths, target, strict)
- **Source maps** — `.js.map` generation for debugging
- **Visual settings UI** — WebView-based config editor, no JSON hand-editing

### Error Handling

Compile Hero spammed toast notifications on every compile error. SaveFlow uses the **VS Code Problems panel** — the same UX as ESLint or TypeScript.

Errors appear inline with:
- File path
- Line number
- Column
- Compiler error message

**Silent on success. Loud on failure.**

---

## Migration from Compile Hero

If you're a Compile Hero user, SaveFlow's settings map cleanly:

| Compile Hero | SaveFlow |
|---|---|
| `compile-hero.disable-compile-files-on-did-save-code` | `saveflow.scss.enabled: false` |
| `compile-hero.scss-output-directory` | `saveflow.scss.outputDirectory` |
| `compile-hero.less-output-directory` | `saveflow.less.outputDirectory` |
| `compile-hero.stylus-output-directory` | `saveflow.stylus.outputDirectory` |
| `compile-hero.javascript-output-directory` | `saveflow.typescript.outputDirectory` (Pro) |
| `compile-hero.ignore` | `saveflow.ignore` |

### Example Migration

**Before (Compile Hero):**
```json
{
  "compile-hero.scss-output-directory": "dist/css",
  "compile-hero.disable-compile-files-on-did-save-code": false,
  "compile-hero.ignore": ["**/node_modules/**"]
}
```

**After (SaveFlow):**
```json
{
  "saveflow.scss.outputDirectory": "dist/css",
  "saveflow.scss.enabled": true,
  "saveflow.ignore": ["**/node_modules/**"]
}
```

---

## Why TypeScript Is a Pro Feature

SCSS, Less, and Stylus are niche preprocessors with smaller user bases. Making them free ensures the core audience gets full value at zero cost.

TypeScript is the most popular compile-on-save use case. Gating it behind Pro (£4.99/year) funds continued development and support for the entire extension.

The free tier is **genuinely useful** — not a crippled demo. If you only use SCSS, you never need Pro.

---

## Technical Architecture

SaveFlow is built with modern VS Code APIs and strict TypeScript:

- **Compilers** — thin wrappers around Dart Sass, Less, Stylus, TypeScript
- **Import graph** — tracks SCSS `@use`/`@forward`/`@import` dependencies
- **Output resolver** — computes output paths from workspace settings
- **Problem reporter** — maps compiler errors to VS Code's DiagnosticCollection
- **Licence validator** — LemonSqueezy API integration for Pro activation (offline grace: 7 days)

All compilers run in the extension host process (not child processes), making them fast and debuggable.

### Why Not Child Processes?

Compile Hero spawned child processes for each compilation. This added overhead and made error handling fragile.

SaveFlow runs compilers in-process:
```typescript
import * as sass from 'sass';

const result = sass.compileString(source, {
  loadPaths: [workspaceRoot],
  style: minify ? 'compressed' : 'expanded'
});
```

This is faster, simpler, and easier to debug. If CPU usage becomes a bottleneck in the future, I'll revisit this decision — but for v1, it's the right trade-off.

---

## Lessons Learned

### 1. Read the 1-Star Reviews

Every bug I fixed came from reading Compile Hero's negative reviews. Users tell you exactly what's broken — you just have to listen.

### 2. Lazy Activation Is Non-Negotiable

If your extension can activate lazily (`onLanguage:`, `onCommand:`, etc.), it **must**. Using `*` activation is a guaranteed way to destroy performance on large workspaces.

### 3. Use the Platform

VS Code has a DiagnosticCollection API, a file watcher API, and a secrets storage API. Don't reinvent them. Compile Hero used toast notifications for errors — SaveFlow uses the Problems panel because that's what VS Code already does for ESLint, TypeScript, and every other language tool.

### 4. Monetisation Matters

Open-source burnout is real. Compile Hero was free, got 216,000 installs, and was abandoned. SaveFlow has a free tier that's genuinely useful and a Pro tier that funds continued development.

If you want your extension to be maintained in 2027, you need a business model.

---

## Try SaveFlow

SaveFlow is live on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ginger-turtle.saveflow).

- **Free tier** — SCSS, Less, Stylus compile on save with partial watch
- **Pro tier** — TypeScript compile on save, source maps, visual settings UI (£4.99/year or £14.99 lifetime)

If you've been stuck with Compile Hero, give SaveFlow a try. It's what Compile Hero should have been.

---

**Built with [Claude Code](https://claude.com/claude-code) by [Ginger Turtle](https://gingerturtleapps.com)**

GitHub: [ginger-turtle/saveflow](https://github.com/ginger-turtle/saveflow)
