interface YTPlayer extends HTMLElement {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getAdState?(): number;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  isMuted?(): boolean;
  mute?(): void;
  unMute?(): void;
  setVolume?(v: number): void;
  getVolume?(): number;
}

import { API_CHANNEL } from './apiChannel';

const CHANNEL = API_CHANNEL;

function getPlayer(): YTPlayer | null {
  return document.getElementById('movie_player') as YTPlayer | null;
}

interface ApiRequest {
  channel: typeof CHANNEL;
  direction: 'req';
  id: string;
  method: keyof YTPlayer;
  args: unknown[];
}

interface ApiResponse {
  channel: typeof CHANNEL;
  direction: 'res';
  id: string;
  ok: boolean;
  value?: unknown;
  error?: string;
}
//listen for messages from the content script and call the corresponding YTPlayer method, then respond with the result or error.
window.addEventListener('message', (ev: MessageEvent) => {
  if (ev.source !== window) return;
  const data = ev.data as ApiRequest | undefined;
  if (!data || data.channel !== CHANNEL || data.direction !== 'req') return;

  const player = getPlayer();
  const reply = (r: Omit<ApiResponse, 'channel' | 'direction' | 'id'>) =>
    window.postMessage({ channel: CHANNEL, direction: 'res', id: data.id, ...r } satisfies ApiResponse, '*');

  if (!player) return reply({ ok: false, error: 'no #movie_player' });
  const fn = player[data.method] as ((...a: unknown[]) => unknown) | undefined;
  if (typeof fn !== 'function') return reply({ ok: false, error: `no method ${String(data.method)}` });

  try {
    const value = fn.apply(player, data.args);
    reply({ ok: true, value });
  } catch (err) {
    reply({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Announce readiness to the isolated-world bridge. The MAIN-world and content
// scripts both run at document_idle with no ordering guarantee; a single
// synchronous announce can fire before the content listener is attached and be
// lost forever, permanently disabling the API path. Re-announce across a few
// turns of the event loop so a later emission always lands after the listener
// is up. (The content side also self-heals on the first real response.)
function announceReady(): void {
  window.postMessage({ channel: CHANNEL, direction: 'res', id: '__ready__', ok: true } satisfies ApiResponse, '*');
}
announceReady();
setTimeout(announceReady, 0);
if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => announceReady());
