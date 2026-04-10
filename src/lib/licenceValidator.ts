import * as vscode from 'vscode';

const LICENCE_KEY_SECRET = 'saveflow.licenceKey';
const LICENCE_STATUS_SECRET = 'saveflow.licenceStatus';
const LICENCE_INSTANCE_SECRET = 'saveflow.licenceInstanceId';
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LEMONSQUEEZY_ACTIVATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/activate';
const LEMONSQUEEZY_DEACTIVATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/deactivate';
export const SAVEFLOW_PRO_ANNUAL_URL = 'https://gingerturtle.lemonsqueezy.com/checkout/buy/97267f1f-0dd6-4d84-8dcc-43e587030340';
export const SAVEFLOW_PRO_LIFETIME_URL = 'https://gingerturtle.lemonsqueezy.com/checkout/buy/39df352c-cc94-4b58-89de-5323df261f6f';

interface LicenceStatus {
  valid: boolean;
  validatedAt: number;
}

interface LicenceInstance {
  id?: string;
}

interface ActivationResponse {
  activated?: boolean;
  error?: string | null;
  instance?: LicenceInstance;
}

interface DeactivationResponse {
  deactivated?: boolean;
  error?: string | null;
}

function isActivationResponse(value: unknown): value is ActivationResponse {
  return typeof value === 'object' && value !== null && 'activated' in value;
}

function isDeactivationResponse(value: unknown): value is DeactivationResponse {
  return typeof value === 'object' && value !== null && 'deactivated' in value;
}

function getInstanceId(response: ActivationResponse): string | null {
  return typeof response.instance?.id === 'string' ? response.instance.id : null;
}

function buildRequestBody(data: Record<string, string>): string {
  return new URLSearchParams(data).toString();
}

/** In-memory cache for the current session — avoids repeated SecretStorage reads. */
let sessionCache: boolean | null = null;

/** Tracks which Pro features have already shown the upgrade prompt this session. */
const promptedFeatures = new Set<string>();

/** Extension context — stored via init() to avoid prop-drilling. */
let _context: vscode.ExtensionContext;

/**
 * Initializes the licence validator with the extension context.
 * Must be called from activate() before any other functions.
 */
export function init(context: vscode.ExtensionContext): void {
  _context = context;
}

/**
 * Returns true if a valid Pro licence is active.
 * Uses cached result within a session; validates against LemonSqueezy on first call.
 */
export async function isProActivated(): Promise<boolean> {
  if (sessionCache !== null) {
    return sessionCache;
  }

  const status = await readCachedStatus(_context);

  if (!status) {
    sessionCache = false;
    return false;
  }

  const ageMs = Date.now() - status.validatedAt;

  if (status.valid && ageMs < GRACE_PERIOD_MS) {
    sessionCache = true;
    return true;
  }

  if (status.valid && ageMs >= GRACE_PERIOD_MS) {
    const key = await _context.secrets.get(LICENCE_KEY_SECRET);
    if (key) {
      const fresh = await validateOnline(key, _context);
      sessionCache = fresh;
      return fresh;
    }
  }

  sessionCache = false;
  return false;
}

/**
 * Shows the Pro upgrade prompt for a named feature.
 * Only shows once per session per feature name.
 */
export async function promptProUpgrade(featureName: string): Promise<void> {
  if (promptedFeatures.has(featureName)) {
    return;
  }
  promptedFeatures.add(featureName);

  const action = await vscode.window.showInformationMessage(
    `SaveFlow Pro is required for ${featureName}.`,
    'Activate Pro',
    'Learn More'
  );

  if (action === 'Activate Pro') {
    void vscode.commands.executeCommand('saveflow.activatePro');
  } else if (action === 'Learn More') {
    void vscode.env.openExternal(vscode.Uri.parse(SAVEFLOW_PRO_ANNUAL_URL));
  }
}

/**
 * Handles the "SaveFlow: Activate Pro" command.
 * Prompts for a licence key, validates it, and stores the result.
 */
export async function activateProCommand(): Promise<void> {
  const key = await vscode.window.showInputBox({
    title: 'SaveFlow Pro — Activate Licence',
    prompt: 'Enter your LemonSqueezy licence key',
    placeHolder: 'XXXX-XXXX-XXXX-XXXX',
    password: false,
    ignoreFocusOut: true,
  });

  if (!key) {
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Validating SaveFlow Pro licence…' },
    async () => {
      const valid = await validateOnline(key, _context);
      if (valid) {
        sessionCache = true;
        vscode.window.showInformationMessage(
          '✅ SaveFlow Pro activated! TypeScript compilation and Pro features are now enabled.'
        );
      } else {
        vscode.window.showErrorMessage(
          'SaveFlow Pro: Licence key is invalid or already in use. '
          + 'Check your LemonSqueezy purchase email for the key or contact support.'
        );
      }
    }
  );
}

/**
 * Handles the "SaveFlow: Deactivate Pro" command for the current machine.
 */
export async function deactivateProCommand(): Promise<void> {
  const key = await _context.secrets.get(LICENCE_KEY_SECRET);
  if (!key) {
    await clearStoredLicence(_context);
    vscode.window.showInformationMessage('SaveFlow Pro is not currently activated on this machine.');
    return;
  }

  const instanceId = await _context.secrets.get(LICENCE_INSTANCE_SECRET);
  if (!instanceId) {
    const action = await vscode.window.showWarningMessage(
      'This SaveFlow Pro activation predates local instance tracking, so it cannot be released automatically. You can clear the local Pro state on this machine now.',
      { modal: true },
      'Clear Local State'
    );

    if (action === 'Clear Local State') {
      await clearStoredLicence(_context);
      vscode.window.showInformationMessage(
        'Local SaveFlow Pro state cleared. If the activation still appears in LemonSqueezy, deactivate it there or contact support.'
      );
    }
    return;
  }

  const action = await vscode.window.showWarningMessage(
    'Deactivate SaveFlow Pro on this machine? You can reactivate later with your licence key.',
    { modal: true },
    'Deactivate Pro'
  );

  if (action !== 'Deactivate Pro') {
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Deactivating SaveFlow Pro…' },
    async () => {
      const deactivated = await deactivateStoredLicence(true);
      if (deactivated) {
        vscode.window.showInformationMessage('SaveFlow Pro deactivated for this machine.');
      } else {
        vscode.window.showErrorMessage(
          'SaveFlow Pro could not be deactivated right now. Please try again later or contact support.'
        );
      }
    }
  );
}

/**
 * Attempts to deactivate the stored SaveFlow Pro licence for this machine.
 * Useful for manual deactivation and optional uninstall cleanup.
 */
export async function deactivateStoredLicence(silent = false): Promise<boolean> {
  const key = await _context.secrets.get(LICENCE_KEY_SECRET);
  const instanceId = await _context.secrets.get(LICENCE_INSTANCE_SECRET);

  if (!key || !instanceId) {
    if (!silent) {
      vscode.window.showWarningMessage('No SaveFlow Pro activation for this machine could be found.');
    }
    return false;
  }

  const deactivated = await deactivateOnline(key, instanceId, _context);

  if (!silent) {
    if (deactivated) {
      vscode.window.showInformationMessage('SaveFlow Pro deactivated for this machine.');
    } else {
      vscode.window.showErrorMessage(
        'SaveFlow Pro could not be deactivated right now. Please try again later or contact support.'
      );
    }
  }

  return deactivated;
}

// ─── Private ────────────────────────────────────────────────────────────────

/** Validates a key against the LemonSqueezy API and stores the result. */
async function validateOnline(
  key: string,
  context: vscode.ExtensionContext
): Promise<boolean> {
  try {
    const response = await fetch(LEMONSQUEEZY_ACTIVATE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: buildRequestBody({
        license_key: key,
        instance_name: `vscode-${vscode.env.machineId}`
      })
    });

    const payload: unknown = await response.json().catch(() => null);
    const valid = response.ok
      && isActivationResponse(payload)
      && payload.activated === true;

    if (valid) {
      await context.secrets.store(LICENCE_KEY_SECRET, key);
      const instanceId = getInstanceId(payload);
      if (instanceId) {
        await context.secrets.store(LICENCE_INSTANCE_SECRET, instanceId);
      }
    } else {
      await context.secrets.delete(LICENCE_KEY_SECRET);
      await context.secrets.delete(LICENCE_INSTANCE_SECRET);
    }

    await context.secrets.store(
      LICENCE_STATUS_SECRET,
      JSON.stringify({ valid, validatedAt: Date.now() } satisfies LicenceStatus)
    );

    return valid;
  } catch {
    const cached = await readCachedStatus(context);
    return cached?.valid ?? false;
  }
}

/** Deactivates the stored machine instance against the LemonSqueezy API. */
async function deactivateOnline(
  key: string,
  instanceId: string,
  context: vscode.ExtensionContext
): Promise<boolean> {
  try {
    const response = await fetch(LEMONSQUEEZY_DEACTIVATE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: buildRequestBody({
        license_key: key,
        instance_id: instanceId
      })
    });

    const payload: unknown = await response.json().catch(() => null);
    const deactivated = response.ok
      && isDeactivationResponse(payload)
      && payload.deactivated === true;

    if (deactivated) {
      await clearStoredLicence(context);
    }

    return deactivated;
  } catch {
    return false;
  }
}

/** Clears the locally stored licence state for the current machine. */
async function clearStoredLicence(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(LICENCE_KEY_SECRET);
  await context.secrets.delete(LICENCE_STATUS_SECRET);
  await context.secrets.delete(LICENCE_INSTANCE_SECRET);
  sessionCache = false;
  promptedFeatures.clear();
}

/** Reads the cached licence status from SecretStorage. */
async function readCachedStatus(
  context: vscode.ExtensionContext
): Promise<LicenceStatus | null> {
  try {
    const raw = await context.secrets.get(LICENCE_STATUS_SECRET);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LicenceStatus;
  } catch {
    return null;
  }
}
