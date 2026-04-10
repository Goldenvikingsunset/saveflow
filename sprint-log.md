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

### P1 — Ship within 2 weeks of launch
- [ ] **Licence deactivation** — call `POST /v1/licenses/deactivate` when extension is
      uninstalled or user runs "SaveFlow: Deactivate Pro" command. Enables licence transfers.
      File: `src/lib/licenceValidator.ts` + new command in `package.json`
- [ ] **Delete Default variant 1513833** in LemonSqueezy dashboard (housekeeping)

### P2 — Ship within 4 weeks if demand warrants
- [ ] **Compile Hero migration command** — `SaveFlow: Import Compile Hero Settings`
      Reads `compile-hero.*` keys from workspace settings, maps them 1:1 to `saveflow.*`
      keys. Lowers friction for the 216k displaced users.
- [ ] **VSIX size reduction** — 7MB is large. Investigate lazy-loading the TypeScript
      compiler — only `require('typescript')` when Pro is activated. Could drop to ~2MB.
- [ ] **Sass `@use`/`@forward` partial graph** — current graph parses `@import` reliably
      but `@use` with namespaces needs more testing on complex codebases.

### P3 — Consider at 1,000+ installs
- [ ] **Multi-machine licence** — offer a higher-tier variant (e.g. 3 machines) for teams
- [ ] **Status bar indicator** — small "SF" icon showing compile state (idle/compiling/error)
- [ ] **OVSX publish** — publish to open-vsx.org for VS Codium users (same VSIX)

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
