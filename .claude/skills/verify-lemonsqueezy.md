---
name: verify-lemonsqueezy
description: Use after a LemonSqueezy product has been created for SaveFlow Pro. Verifies the product config, retrieves the correct IDs, checks the licence validation implementation in licenceValidator.ts, and confirms the checkout URL format is correct.
context: fork
agent: General
---

# Skill: Verify LemonSqueezy Integration for SaveFlow Pro

## What This Skill Does
Uses the LemonSqueezy MCP to retrieve live product/variant/store data, then cross-checks
it against the implementation in `src/lib/licenceValidator.ts` to confirm everything
is wired correctly before publishing.

## Step 1 — Retrieve Store Info
Use the LemonSqueezy MCP to list stores and confirm the Ginger Turtle store exists.
Note the `store_id` — you will need it.

Expected:
- Store name: Ginger Turtle (or similar)
- Store currency: GBP

## Step 2 — Find the SaveFlow Pro Product
List products in the store and find SaveFlow Pro.
Note the `product_id`.

Expected product config:
- Name: "SaveFlow Pro"
- Two variants:
  - Annual: £4.99/yr
  - Lifetime: £14.99 one-time

## Step 3 — Get Variant IDs
List variants for the SaveFlow Pro product.
Note both `variant_id` values (Annual and Lifetime).

## Step 4 — Check licenceValidator.ts Against Live Data

Read `src/lib/licenceValidator.ts` and verify:

### 4a — Activation endpoint
The file should POST to:
```
https://api.lemonsqueezy.com/v1/licenses/activate
```
NOT `/validate` — activation creates an instance. Validation checks an existing one.
Confirm the correct endpoint is used.

### 4b — Request body
Should send:
```json
{
  "license_key": "<key>",
  "instance_name": "vscode-<machineId>"
}
```
Confirm `instance_name` is set (required by LemonSqueezy to track activations).

### 4c — Response handling
LemonSqueezy returns:
```json
{
  "activated": true,
  "instance": { "id": "...", "name": "..." },
  "meta": { "store_id": 123, "product_id": 456, "variant_id": 789 }
}
```
Confirm the code checks `response.activated === true`, not just `response.ok`.

### 4d — Deactivation (nice to have, not blocking)
Check if there is a deactivation call on uninstall. If not, note it as a post-launch
improvement — LemonSqueezy allows users to transfer licences between machines only if
the old instance is deactivated.

## Step 5 — Generate Checkout URLs
Using the variant IDs from Step 3, construct the checkout URLs:

Annual:
```
https://gingerturtleapps.lemonsqueezy.com/checkout/buy/<annual-variant-id>
```

Lifetime:
```
https://gingerturtleapps.lemonsqueezy.com/checkout/buy/<lifetime-variant-id>
```

Check that these URLs are referenced correctly in:
- `src/lib/licenceValidator.ts` — the "Learn More" / upgrade CTA link
- `README.md` — the Pro section upgrade link
- `media/settings.html` — the upgrade CTA shown to free users

If any of those files have placeholder URLs (e.g. `gingerturtleapps.com/saveflow#pro`),
update them to the real checkout URLs.

## Step 6 — Update CLAUDE.md
Add a "LemonSqueezy IDs" section to CLAUDE.md:

```markdown
## LemonSqueezy Product IDs

| Item | ID |
|---|---|
| Store ID | <store_id> |
| Product ID (SaveFlow Pro) | <product_id> |
| Variant ID — Annual (£4.99) | <annual_variant_id> |
| Variant ID — Lifetime (£14.99) | <lifetime_variant_id> |
| Annual Checkout URL | https://...lemonsqueezy.com/checkout/buy/<id> |
| Lifetime Checkout URL | https://...lemonsqueezy.com/checkout/buy/<id> |
```

## Step 7 — Report
Output a summary:

```
LemonSqueezy Integration Verification
======================================
Store:            <name> (ID: <id>)
Product:          SaveFlow Pro (ID: <id>)
Variants:         Annual £4.99 (ID: <id>), Lifetime £14.99 (ID: <id>)

Endpoint:         [OK / MISMATCH]
Request body:     [OK / MISSING instance_name]
Response check:   [OK / checking .ok not .activated]
Checkout URLs:    [OK / PLACEHOLDER — updated]
CLAUDE.md:        [Updated / Already correct]

Issues found: <n>
```

If any issues are found, fix them in the source files before reporting complete.
