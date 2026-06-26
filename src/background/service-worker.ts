import type { Msg } from '../shared/messages';

const OFFSCREEN_URL = 'src/offscreen/offscreen.html';

// The most recent YT tab that asked us to open a voice session. The offscreen
// document broadcasts events; the SW relays them only to this tab.
let activeTabId: number | undefined;

// Only these message types call sendResponse(). Returning true for fire-and-forget
// broadcasts (state changes, transcripts, tool calls from offscreen) makes Chrome
// expect a response and surface "channel closed before response received" errors.
const REQUEST_RESPONSE_TYPES = new Set<Msg['type']>([
  'START_SESSION', 'STOP_SESSION', 'TOOL_RESULT',
]);

chrome.runtime.onMessage.addListener((raw: Msg, sender, sendResponse) => {
  if (raw.dest !== 'sw') return false;
  void route(raw, sender, sendResponse);
  return REQUEST_RESPONSE_TYPES.has(raw.type);
});

async function route(
  msg: Extract<Msg, { dest: 'sw' }>,
  sender: chrome.runtime.MessageSender,
  sendResponse: (resp: unknown) => void,
): Promise<void> {
  console.log('[sw] route', msg.type);

  if (msg.type === 'START_SESSION') {
    if (sender.tab?.id !== undefined) activeTabId = sender.tab.id;
    try {
      await ensureOffscreen();
      console.log('[sw] offscreen ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[sw] offscreen create failed:', message);
      relayToTab({ dest: 'content', type: 'STATE_CHANGE', state: { kind: 'error', message: `offscreen: ${message}` } });
      sendResponse({ ok: false });
      return;
    }
    // Tiny delay lets the offscreen JS load its message listener before we fire.
    await new Promise((r) => setTimeout(r, 50));
    chrome.runtime.sendMessage({
      dest: 'offscreen', type: 'START_SESSION',
      agentId: msg.agentId, language: msg.language,
    } satisfies Msg).catch((err) => console.error('[sw] send START_SESSION to offscreen failed:', err));
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === 'STOP_SESSION') {
    void stopSession('content-stop');
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === 'TOOL_RESULT') {
    chrome.runtime.sendMessage({
      dest: 'offscreen', type: 'TOOL_RESULT', requestId: msg.requestId, instruction: msg.instruction,
    } satisfies Msg).catch((err) => console.error('[sw] send TOOL_RESULT to offscreen failed:', err));
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === 'OFFSCREEN_STATE_CHANGE') {
    console.log('[sw] state:', JSON.stringify(msg.state));
    relayToTab({ dest: 'content', type: 'STATE_CHANGE', state: msg.state });
    return;
  }

  if (msg.type === 'OFFSCREEN_TRANSCRIPT') {
    relayToTab({ dest: 'content', type: 'TRANSCRIPT', text: msg.text });
    return;
  }

  if (msg.type === 'OFFSCREEN_TOOL_CALL') {
    relayToTab({ dest: 'content', type: 'TOOL_CALL', requestId: msg.requestId, args: msg.args });
    return;
  }
}

function relayToTab(msg: Extract<Msg, { dest: 'content' }>): void {
  if (activeTabId === undefined) return;
  void chrome.tabs.sendMessage(activeTabId, msg).catch(() => {
    // Tab gone; clear so future broadcasts don't pile up errors.
    activeTabId = undefined;
  });
}

async function ensureOffscreen(): Promise<void> {
  try {
    if (typeof chrome.offscreen.hasDocument === 'function') {
      const existing = await chrome.offscreen.hasDocument();
      if (existing) return;
    }
  } catch { /* fall through and try createDocument */ }
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [
        chrome.offscreen.Reason.USER_MEDIA,
        chrome.offscreen.Reason.WEB_RTC,
      ],
      justification: 'WebRTC voice session to ElevenLabs requires microphone access from a context with the extension CSP.',
    });
  } catch (err) {
    // The most common cause is "Only a single offscreen document may be created" — already exists.
    const msg = err instanceof Error ? err.message : String(err);
    if (!/single offscreen|already exists/i.test(msg)) throw err;
  }
}

async function stopSession(reason: string): Promise<void> {
  console.log('[sw] stopSession reason=', reason);
  activeTabId = undefined;
  // Tell the offscreen to end its Conversation first (closes WebSocket cleanly,
  // so ElevenLabs marks the conversation as ended).
  try {
    await chrome.runtime.sendMessage({ dest: 'offscreen', type: 'STOP_SESSION' } satisfies Msg);
  } catch { /* offscreen may already be gone */ }
  // Then tear down the offscreen document entirely — releases the mic indicator
  // and frees the audio context. Recreated next time START_SESSION arrives.
  try {
    const hasDoc = typeof chrome.offscreen.hasDocument === 'function' ? await chrome.offscreen.hasDocument() : true;
    if (hasDoc && typeof chrome.offscreen.closeDocument === 'function') {
      await chrome.offscreen.closeDocument();
    }
  } catch { /* ignore */ }
}

const WATCH_URL_RE = /^https:\/\/www\.youtube\.com\/watch/;

// Tab closed.
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) void stopSession('tab-removed');
});

// Tab navigated away from a watch page (in-tab SPA nav also fires this on URL change).
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId !== activeTabId) return;
  if (changeInfo.url && !WATCH_URL_RE.test(changeInfo.url)) {
    void stopSession('tab-navigated-away');
  }
});

// SW can be suspended/restarted between events; activeTabId is lost on restart.
// On wake, re-discover whether any watch tab still exists. If not, kill any
// orphaned offscreen (and thus any orphaned ElevenLabs conversation).
async function rehydrate(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/watch*' });
    if (tabs.length === 0) {
      await stopSession('rehydrate-no-watch-tabs');
      return;
    }
    if (activeTabId === undefined && tabs[0]?.id !== undefined) {
      activeTabId = tabs[0].id;
    }
  } catch { /* tabs API may transiently fail; harmless */ }
}
chrome.runtime.onStartup.addListener(() => void rehydrate());
void rehydrate();

