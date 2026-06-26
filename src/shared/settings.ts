export interface Settings {
  enabled: boolean;
  language: string;
  agentId: string;
}

const DEFAULTS: Settings = { enabled: true, language: 'en', agentId: '' };
export const SETTINGS_KEY = 'settings';
const KEY = SETTINGS_KEY;

export async function loadSettings(): Promise<Settings> {
  const got = await chrome.storage.local.get([KEY]);
  const s = got[KEY];
  if (!s || typeof s !== 'object') return DEFAULTS;
  return { ...DEFAULTS, ...(s as Partial<Settings>) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: s });
}

export function isValidAgentId(id: string): boolean {
  return /^agent_[a-z0-9]+$/i.test(id);
}
