---
name: pro-gate
description: Playbook for adding a new Pro-only feature to SaveFlow. Ensures the gate is implemented consistently and the LemonSqueezy validation flow is not bypassed.
---

# Skill: Adding a Pro Feature Gate

## The Pattern — Use This Exactly, Every Time

### In the feature function
```typescript
import { isProActivated } from '../lib/licenceValidator';
import * as vscode from 'vscode';

export async function myProFeature(): Promise<void> {
  // ALWAYS the first thing in any Pro feature
  if (!await isProActivated()) {
    promptProUpgrade('Feature Name');
    return;
  }

  // ... feature implementation
}
```

### The shared upgrade prompt (already in licenceValidator.ts)
```typescript
export async function promptProUpgrade(featureName: string): Promise<void> {
  const action = await vscode.window.showInformationMessage(
    `SaveFlow Pro is required for ${featureName}.`,
    'Activate Pro',
    'Learn More'
  );
  if (action === 'Activate Pro') {
    vscode.commands.executeCommand('saveflow.activatePro');
  } else if (action === 'Learn More') {
    vscode.env.openExternal(vscode.Uri.parse('https://gingerturtleapps.com/saveflow'));
  }
}
```

## Rules
1. Call `isProActivated()` ONCE at the entry point — never deep inside a helper
2. Show the upgrade prompt ONCE per session per feature — use a `Set<string>` to track shown prompts
3. Never hardcode "Pro" behaviour conditionally scattered through the code — gate at the top
4. The gate must work offline — `isProActivated()` uses cached SecretStorage, not a live API call on every save

## Checklist for a New Pro Feature
- [ ] `isProActivated()` called at the top of the entry function
- [ ] `promptProUpgrade('<feature name>')` called on false
- [ ] Feature listed in CLAUDE.md Settings Reference with **Pro** in the Tier column
- [ ] `package.json` setting has `markdownDescription` mentioning "Requires SaveFlow Pro"
- [ ] Feature listed on the marketplace page under "Pro Features"
