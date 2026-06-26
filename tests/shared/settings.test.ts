import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSettings, saveSettings, isValidAgentId } from '../../src/shared/settings';

describe('settings', () => {
  let store: Record<string, unknown>;

  beforeEach(() => {
    store = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async (keys: string[]) => {
            const out: Record<string, unknown> = {};
            for (const k of keys) if (k in store) out[k] = store[k];
            return out;
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(store, items);
          }),
        },
      },
    };
  });

  it('defaults agentId to empty string', async () => {
    const s = await loadSettings();
    expect(s.agentId).toBe('');
    expect(s.enabled).toBe(true);
    expect(s.language).toBe('en');
  });

  it('round-trips a saved agentId', async () => {
    await saveSettings({ enabled: true, language: 'en', agentId: 'agent_abc123' });
    const s = await loadSettings();
    expect(s.agentId).toBe('agent_abc123');
  });

  it('merges agentId over partial stored settings', async () => {
    store.settings = { enabled: false };
    const s = await loadSettings();
    expect(s.enabled).toBe(false);
    expect(s.agentId).toBe('');
  });

  it('validates agent id format', () => {
    expect(isValidAgentId('agent_abc123')).toBe(true);
    expect(isValidAgentId('')).toBe(false);
    expect(isValidAgentId('tool_123')).toBe(false);
    expect(isValidAgentId('agent_with-dash')).toBe(false);
  });
});
