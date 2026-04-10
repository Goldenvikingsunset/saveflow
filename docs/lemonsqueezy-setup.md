# SaveFlow Pro — LemonSqueezy Product Setup Guide

## Before You Start
Log into your LemonSqueezy account at app.lemonsqueezy.com
Confirm your store is named "Ginger Turtle" (or close to it)

---

## Product: SaveFlow Pro

### 1. Create the Product
- Go to: Store → Products → New Product
- Type: **Software licence / key**
- Name: `SaveFlow Pro`
- Description:
  ```
  Unlocks TypeScript compile on save (with full tsconfig.json support),
  the Settings UI panel, and SCSS source maps in the SaveFlow VS Code extension.
  ```
- Thumbnail: upload `assets/icons/icon-128.png`

---

### 2. Create Variant 1 — Annual

| Field | Value |
|---|---|
| Name | Annual Licence |
| Price | £4.99 |
| Billing period | Yearly |
| Licence key | ✅ Enable |
| Licence key limit | 1 activation per key |
| Licence key expiry | 1 year (renews with subscription) |

### 3. Create Variant 2 — Lifetime

| Field | Value |
|---|---|
| Name | Lifetime Licence |
| Price | £14.99 |
| Billing period | One-time |
| Licence key | ✅ Enable |
| Licence key limit | 1 activation per key |
| Licence key expiry | Never |

---

### 4. Confirmation Email
In Product → Email settings, confirm the receipt email includes:
- The licence key prominently
- A link to the VS Code Marketplace listing
- Instructions: "Open VS Code → Command Palette → SaveFlow: Activate Pro → paste your key"

---

### 5. After Creating the Product
Run Claude Code with this prompt:

```
Read CLAUDE.md and sprint-log.md. The LemonSqueezy product for SaveFlow Pro
has been created. Use the LemonSqueezy MCP and the verify-lemonsqueezy skill
to check the integration, retrieve the real product/variant IDs, update all
placeholder URLs in the codebase, and report any issues found.
```

Claude Code will use the LemonSqueezy MCP to retrieve the live IDs and verify
everything is wired correctly.
