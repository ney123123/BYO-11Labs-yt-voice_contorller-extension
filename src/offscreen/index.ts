import { Conversation, type Language } from '@elevenlabs/client';
import type { Msg, VoiceState } from '../shared/messages';
import { SKIP_TURN_INSTRUCTION } from '../shared/commands';

// Fire-and-forget cross-context send. In MV3 sendMessage rejects with
// "Could not establish connection" when the SW is suspended/gone; swallow
// those so they don't surface as unhandled rejections.
function send(msg: Msg): void {
  void chrome.runtime.sendMessage(msg).catch(() => {});
}

// MV3 extension CSP forbids loading scripts from blob: / data: URLs even in
// the offscreen document. The ElevenLabs SDK ships its AudioWorklets as
// inline source strings and tries blob: first, data: second, then gives up.
// We pre-bundle the worklet sources as static files under /worklets/ and
// redirect addModule() calls from blob:/data: URLs to chrome-extension URLs.
// The SDK does not call addModule at import time (only inside startSession),
// so installing the patch synchronously here is sufficient.
patchAudioWorkletAddModule();

function patchAudioWorkletAddModule(): void {
  if (typeof AudioWorklet === 'undefined') return;
  const orig = AudioWorklet.prototype.addModule;
  AudioWorklet.prototype.addModule = async function (
    this: AudioWorklet,
    moduleURL: string,
    options?: WorkletOptions,
  ): Promise<void> {
    const url = String(moduleURL);
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      try {
        const text = await (await fetch(url)).text();
        if (text.includes('registerProcessor("raw-audio-processor"')) {
          return orig.call(this, chrome.runtime.getURL('worklets/raw-audio-processor.js'), options);
        }
        if (text.includes('registerProcessor("audio-concat-processor"')) {
          return orig.call(this, chrome.runtime.getURL('worklets/audio-concat-processor.js'), options);
        }
      } catch {
        // Fall through and let the original call surface its real error.
      }
    }
    return orig.call(this, moduleURL, options);
  };
}

let conversation: Conversation | null = null;
const pendingTools = new Map<string, (instruction: string) => void>();

const TOOL_TIMEOUT_MS = 3000;

chrome.runtime.onMessage.addListener((raw: Msg) => {
  if (raw.dest !== 'offscreen') return false;
  void handle(raw);
  return false;
});

async function handle(msg: Extract<Msg, { dest: 'offscreen' }>): Promise<void> {
  if (msg.type === 'START_SESSION')  return start(msg.agentId, msg.language);
  if (msg.type === 'STOP_SESSION')   return stop();
  if (msg.type === 'TOOL_RESULT')    return resolveTool(msg.requestId, msg.instruction);
}

function pushState(state: VoiceState): void {
  send({ dest: 'sw', type: 'OFFSCREEN_STATE_CHANGE', state });
}

function pushTranscript(text: string): void {
  send({ dest: 'sw', type: 'OFFSCREEN_TRANSCRIPT', text });
}

function resolveTool(requestId: string, instruction: string): void {
  const resolve = pendingTools.get(requestId);
  if (!resolve) return;
  pendingTools.delete(requestId);
  resolve(instruction);
}

async function start(agentId: string, language: string): Promise<void> {
  await stop();
  pushState({ kind: 'connecting' });

  try {
    conversation = await Conversation.startSession({
      agentId,
      overrides: language === 'auto' ? {} : { agent: { language: language as Language } },
      clientTools: {
        executeYTCommand: async (args) => {
          const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const wait = new Promise<string>((resolve) => {
            pendingTools.set(requestId, resolve);
            setTimeout(() => {
              if (pendingTools.delete(requestId)) {
                resolve(SKIP_TURN_INSTRUCTION);
              }
            }, TOOL_TIMEOUT_MS);
          });
          send({
            dest: 'sw',
            type: 'OFFSCREEN_TOOL_CALL',
            requestId,
            args: args as Record<string, unknown>,
          });
          const instruction = await wait;
          return JSON.stringify({ instruction });
        },
      },
      onConnect: () => {
        pushState({ kind: 'listening' });
      },
      onDisconnect: () => {
        pushState({ kind: 'idle' });
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        pushState({ kind: 'error', message });
      },
      onMessage: (msg: unknown) => {
        if (isUserFinalTranscript(msg)) pushTranscript(extractText(msg));
      },
    });
    // Mute agent output. MUST run AFTER startSession resolves: the SDK fires
    // onConnect from inside the constructor before this promise resolves, so
    // calling setVolume in onConnect would target a still-null `conversation`.
    conversation.setVolume({ volume: 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    pushState({ kind: 'error', message });
  }
}

async function stop(): Promise<void> {
  try { await conversation?.endSession(); } catch { /* no-op */ }
  conversation = null;
  for (const resolve of pendingTools.values()) resolve(SKIP_TURN_INSTRUCTION);
  pendingTools.clear();
  pushState({ kind: 'idle' });
}

function isUserFinalTranscript(msg: unknown): boolean {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return m.source === 'user' && m.type === 'transcript' && m.is_final === true;
}

function extractText(msg: unknown): string {
  if (!msg || typeof msg !== 'object') return '';
  const m = msg as Record<string, unknown>;
  return typeof m.message === 'string' ? m.message : typeof m.text === 'string' ? m.text : '';
}
