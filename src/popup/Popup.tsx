import { useEffect, useState, type FC } from 'react';
import { loadSettings, saveSettings, isValidAgentId, type Settings } from '../shared/settings';

const LANGUAGES: { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en',   label: 'English' },
  { value: 'zh',   label: 'Chinese (中文)' },
  { value: 'ja',   label: 'Japanese (日本語)' },
  { value: 'es',   label: 'Spanish' },
  { value: 'fr',   label: 'French' },
];

type MicState = 'unknown' | 'granted' | 'prompt' | 'denied';

export const Popup: FC = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [mic, setMic] = useState<MicState>('unknown');
  const [grantError, setGrantError] = useState<string | null>(null);

  useEffect(() => { void loadSettings().then(setS); }, []);
  useEffect(() => { void refreshMic().then(setMic); }, []);

  const update = (patch: Partial<Settings>) => {
    if (!s) return;
    const next = { ...s, ...patch };
    setS(next);
    void saveSettings(next);
  };

  const grant = () => {
    setGrantError(null);
    // getUserMedia from a popup gets cancelled when the popup closes (clicking
    // Chrome's prompt closes the popup). Open a dedicated tab instead — tabs
    // survive clicks elsewhere so the prompt can complete.
    chrome.tabs.create({ url: chrome.runtime.getURL('src/permission/permission.html') });
    window.close();
  };

  if (!s) return <div>Loading…</div>;

  return (
    <div>
      <h1>YT Voice</h1>

      {mic !== 'granted' && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', padding: 8, borderRadius: 4, marginBottom: 8 }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>
            Microphone access is required for voice control. Grant it once and it persists for this extension.
          </div>
          <button type="button" onClick={grant} style={{ fontSize: 12, padding: '4px 8px' }}>
            Grant microphone
          </button>
          {grantError && <div style={{ color: '#a00', fontSize: 11, marginTop: 4 }}>{grantError}</div>}
        </div>
      )}

      <label>
        <input type="checkbox" checked={s.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        Voice control {s.enabled ? 'ON' : 'OFF'}
      </label>
      <label>
        Language:
        <select value={s.language} onChange={(e) => update({ language: e.target.value })}>
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        ElevenLabs Agent ID:
        <input
          type="text"
          value={s.agentId}
          placeholder="agent_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          onChange={(e) => update({ agentId: e.target.value.trim() })}
          style={{ width: '100%', fontSize: 12, marginTop: 2 }}
        />
      </label>
      {!isValidAgentId(s.agentId) && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', padding: 8, borderRadius: 4, margin: '8px 0', fontSize: 12 }}>
          Paste your own public ElevenLabs Agent ID to enable voice control.
          Run <code>npx tsx scripts/setup-agent.ts</code> once to create it — see the README.
        </div>
      )}
      <p className="hint">
        Open a YouTube watch page and try: "pause", "skip forward 10 seconds", "1.5x speed", "captions on".
      </p>
      <p className="hint">
        Privacy: audio is streamed to ElevenLabs for transcription and never stored by this extension.
      </p>
    </div>
  );
};

async function refreshMic(): Promise<MicState> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    if (status.state === 'granted')  return 'granted';
    if (status.state === 'denied')   return 'denied';
    return 'prompt';
  } catch {
    return 'unknown';
  }
}
