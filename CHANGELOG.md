# Changelog

All notable changes to SaveFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.1] - 2026-05-11

### Changed

- Improved VS Code Marketplace discoverability metadata:
	- Expanded and refined extension keywords/tags in `package.json`
	- Updated listing description for stronger search intent coverage
	- Added search-intent copy near the top of `README.md`

## [0.1.0] - 2026-04-10

### Added

**Initial release — the maintained Compile Hero replacement.**

#### Core Features (Free Tier)

- **SCSS/Sass compile on save** — full Dart Sass support with `@use`, `@forward`, and legacy `@import`
- **SCSS partial watch** — automatically recompiles parent files when `_partials.scss` are saved (import graph tracking)
- **Less compile on save** — full Less.js v4 support
- **Stylus compile on save** — full Stylus support
- **Minify toggle** — per-language minification control (`saveflow.<language>.minify`)
- **Output directory routing** — configurable output paths per language (`saveflow.<language>.outputDirectory`)
- **Ignore globs** — exclude files from compilation with glob patterns (`saveflow.ignore`)

#### Error Handling

- **VS Code Problems panel integration** — compiler errors appear inline with file path, line number, and column
- **No toast spam** — silent on success, loud on failure (errors only)

#### Performance

- **CPU-safe activation** — lazy activation via `onLanguage:` events (activates only when opening SCSS/Less/Stylus files)
- **Zero polling** — event-driven architecture using `workspace.onDidSaveTextDocument`
- **Extension host execution** — compilers run in-process for fast turnaround

#### Import Graph (SCSS)

- Tracks `@use`, `@forward`, and `@import` dependencies across workspace
- Automatically invalidates graph entries on file create/delete/rename
- Transitive parent recompilation — saving `_variables.scss` recompiles all files that depend on it

#### Commands

- `SaveFlow: Compile Current File` — manually trigger compilation
- `SaveFlow: Show Output` — open debug output channel
- `SaveFlow: Activate Pro` — enter Pro licence key (Pro features coming in v0.2.0)

---

## [Unreleased]

### Planned for v0.2.0 (Pro Features)

- TypeScript compile on save (honours `tsconfig.json`)
- Source map generation for TypeScript output (`.js.map`)
- Visual settings UI panel (WebView-based config editor)

---

[0.1.0]: https://github.com/ginger-turtle/saveflow/releases/tag/v0.1.0
