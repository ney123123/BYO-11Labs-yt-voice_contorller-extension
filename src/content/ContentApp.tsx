import { useEffect, useMemo, useState, type FC } from 'react';
import { FloatingOrb, type OrbState } from './FloatingOrb';
import { TranscriptBubble } from './TranscriptBubble';
import { YTPlayerBridge } from './ytPlayerBridge';
import { parseYTCommand } from './commandTools';
import { loadSettings, isValidAgentId, SETTINGS_KEY, type Settings } from '../shared/settings';
import { SKIP_TURN_INSTRUCTION, type YTCommand } from '../shared/commands';
import type { Msg, VoiceState } from '../shared/messages';

const NOOP_FLASH_MS = 800;
const EXEC_FLASH_MS = 350;

export const ContentApp: FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
  const [transcript, setTranscript] = useState<string | null>(null);

  const bridge = useMemo(() => new YTPlayerBridge(), []);

  useEffect(() => { void loadSettings().then(setSettings); }, []);

  // The popup (a different context) writes settings to chrome.storage.local.
  // Without this listener an already-open watch tab keeps its first-loaded
  // settings forever — toggling "Voice control" off in the popup would not stop
  // the mic stream on this tab. Re-load on any change to stay in sync.
  useEffect(() => {
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ): void => {
      if (area !== 'local' || !changes[SETTINGS_KEY]) return;
      void loadSettings().then(setSettings);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  // Tear down the bridge's MutationObserver when the content app unmounts
  // (SPA navigation away from /watch). Without this, observers leak on stale
  // DOM and accumulate across watch → non-watch → watch round trips.
  useEffect(() => () => bridge.dispose(), [bridge]);

  // Lifecycle: start/stop the offscreen session when settings change.
  useEffect(() => {
    if (!settings) return;
    if (!settings.enabled) {
      send({ dest: 'sw', type: 'STOP_SESSION' });
      setOrbState('idle');
      return;
    }
    if (!isValidAgentId(settings.agentId)) {
      send({ dest: 'sw', type: 'STOP_SESSION' });
      setError('Set your ElevenLabs Agent ID in the extension popup.');
      setOrbState('error');
      return;
    }
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      setError(undefined);
      setOrbState('connecting');
      send({
        dest: 'sw', type: 'START_SESSION',
        agentId: settings.agentId, language: settings.language,
      });
    })();
    return () => {
      cancelled = true;
      send({ dest: 'sw', type: 'STOP_SESSION' });
    };
  }, [settings]);

  // Inbound messages from SW (which relays from offscreen).
  useEffect(() => {
    const listener = (raw: Msg): void => {
      if (raw.dest !== 'content') return;
      if (raw.type === 'STATE_CHANGE') {
        setOrbState(mapState(raw.state, setError));
        return;
      }
      if (raw.type === 'TRANSCRIPT') {
        setTranscript(raw.text);
        return;
      }
      if (raw.type === 'TOOL_CALL') {
        void runTool(raw.requestId, raw.args, bridge, (cmd, ok) => {
          if (cmd.command === 'noop') {
            setOrbState('noop');
            window.setTimeout(() => setOrbState('listening'), NOOP_FLASH_MS);
          } else if (!ok) {
            setOrbState('error');
            window.setTimeout(() => setOrbState('listening'), NOOP_FLASH_MS);
          } else {
            setOrbState('executing');
            window.setTimeout(() => setOrbState('listening'), EXEC_FLASH_MS);
          }
        });
        return;
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [bridge]);

  return (
    <div className="ytv-root">
      <TranscriptBubble text={transcript} />
      <FloatingOrb
        state={orbState}
        {...(error !== undefined ? { errorMessage: error } : {})}
        onClick={() => {
          if (orbState === 'error') void retryConnect(setSettings, setOrbState, setError);
        }}
      />
    </div>
  );
};

function mapState(s: VoiceState, setError: (e: string | undefined) => void): OrbState {
  if (s.kind === 'error') { setError(s.message); return 'error'; }
  return s.kind;
}

async function runTool(
  requestId: string,
  args: Record<string, unknown>,
  bridge: YTPlayerBridge,
  onResult: (cmd: YTCommand, ok: boolean) => void,
): Promise<void> {
  const cmd = parseYTCommand(args);
  const result = await bridge.executeCommand(cmd);
  onResult(cmd, result.ok);
  send({
    dest: 'sw', type: 'TOOL_RESULT', requestId,
    instruction: SKIP_TURN_INSTRUCTION,
  });
}

// Fire-and-forget cross-context send. In MV3 sendMessage rejects with
// "Could not establish connection" when the SW/offscreen is suspended or gone;
// these are expected for broadcasts, so swallow rather than leak an unhandled
// rejection.
function send(msg: Msg): void {
  void chrome.runtime.sendMessage(msg satisfies Msg).catch(() => {});
}

async function retryConnect(
  setSettings: (s: Settings) => void,
  setOrbState: (s: OrbState) => void,
  setError: (e: string | undefined) => void,
) {
  setError(undefined);
  setOrbState('connecting');
  // Re-set settings to a fresh object so the lifecycle effect re-runs: its
  // cleanup sends STOP_SESSION and the new run sends START_SESSION — a real
  // reconnect. (The old code wrote the wrong storage shape and nothing read it.)
  const cur = await loadSettings();
  setSettings({ ...cur });
}
