import type { YTCommand, BridgeResult } from '../shared/commands';
import { API_CHANNEL } from './apiChannel';

const API_TIMEOUT_MS = 150;

let apiReady = false;
if (typeof window !== 'undefined') {
  window.addEventListener('message', (ev) => {
    if (ev.source !== window) return;
    const d = ev.data as { channel?: string; direction?: string; id?: string; ok?: boolean } | undefined;
    // Any reply on our channel proves the MAIN-world bridge is alive — flip
    // ready on the readiness ping OR on any real response. The MAIN side
    // re-announces __ready__ several times, but if every announcement was
    // missed (listener-attach race), the first real response still self-heals
    // the flag so the API path isn't permanently disabled.
    if (d?.channel === API_CHANNEL && d.direction === 'res') {
      if (d.id === '__ready__' ? d.ok === true : true) apiReady = true;
    }
  });
}

type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function callPlayerApi<T = unknown>(method: string, args: unknown[] = []): Promise<ApiResult<T>> {
  if (!apiReady) return Promise.resolve({ ok: false, error: 'api not ready' });
  return new Promise((resolve) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const onMsg = (ev: MessageEvent) => {
      const d = ev.data as { channel?: string; direction?: string; id?: string; ok?: boolean; value?: unknown; error?: string } | undefined;
      if (d?.channel !== API_CHANNEL || d.direction !== 'res' || d.id !== id) return;
      window.removeEventListener('message', onMsg);
      resolve(d.ok ? { ok: true, value: d.value as T } : { ok: false, error: d.error ?? 'unknown' });
    };
    window.addEventListener('message', onMsg);
    window.postMessage({ channel: API_CHANNEL, direction: 'req', id, method, args }, '*');
    setTimeout(() => { window.removeEventListener('message', onMsg); resolve({ ok: false, error: 'timeout' }); }, API_TIMEOUT_MS);
  });
}

const SELECTORS = {
  moviePlayer: '#movie_player',
  videoContainer: '#movie_player .html5-video-container',
  videoPrimary: '#movie_player video',
  videoFallback: 'video.html5-main-video',
  skipAdButton:
    '.ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button, button[id^="skip-button"]',
  subtitlesButton: '.ytp-subtitles-button',
  fullscreenButton: '.ytp-fullscreen-button',
} as const;

const AD_SHOWING_CLASS = 'ad-showing';
const CAPTIONS_UNAVAILABLE_NEEDLE = 'unavailable';

const SPEED_STEP = 0.25;
const SPEED_MIN = 0.25;
const SPEED_MAX = 2.0;
const VOLUME_STEP = 0.1;

export class YTPlayerBridge {
  private currentVideo: HTMLVideoElement | null = null;
  private observer: MutationObserver | null = null;

  attach(): void {
    if (this.observer) return;
    this.refreshVideo();
    const container = document.querySelector(SELECTORS.videoContainer);
    if (container) {
      this.observer = new MutationObserver(() => this.refreshVideo());
      this.observer.observe(container, { childList: true, subtree: true });
    }
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.currentVideo = null;
  }

  private refreshVideo(): void {
    const primary = document.querySelector<HTMLVideoElement>(SELECTORS.videoPrimary);
    if (primary && isVisible(primary)) { this.currentVideo = primary; return; }
    const all = Array.from(document.querySelectorAll<HTMLVideoElement>('video'));
    const visible = all.filter((v) => isVisible(v) && !v.closest('.miniplayer'));
    this.currentVideo = visible[0] ?? primary ?? null;
  }

  private getVideo(): HTMLVideoElement | null {
    if (this.currentVideo && this.currentVideo.isConnected) return this.currentVideo;
    this.refreshVideo();
    return this.currentVideo;
  }

  private isAdPlaying(): boolean {
    return document.querySelector(SELECTORS.moviePlayer)?.classList.contains(AD_SHOWING_CLASS) ?? false;
  }

  // Read current volume as a 0..1 fraction. Prefer the YouTube player API
  // (0..100 scale) and fall back to the <video> element.
  private async readVolume(v: HTMLVideoElement): Promise<number> {
    const api = await callPlayerApi<number>('getVolume');
    if (api.ok && typeof api.value === 'number') return clamp(api.value / 100, 0, 1);
    return v.volume;
  }

  // Set volume from a 0..1 fraction. Routing through the player API (0..100) is
  // what actually sticks — YouTube continuously re-syncs the <video> element's
  // volume back to its own stored value, so a direct `v.volume =` is silently
  // reverted. We still mirror to the element as a fallback when the API is down.
  private async applyVolume(v: HTMLVideoElement, target: number): Promise<void> {
    const next = clamp(target, 0, 1);
    await callPlayerApi('setVolume', [Math.round(next * 100)]);
    v.volume = next;
  }

  async executeCommand(cmd: YTCommand): Promise<BridgeResult> {
    if (!this.observer) this.attach();

    if (cmd.command === 'noop') return { ok: true };

    if (cmd.command === 'skipAd') {
      const btn = document.querySelector<HTMLButtonElement>(SELECTORS.skipAdButton);
      if (!btn) return { ok: false, reason: 'no skippable ad' };
      btn.click();
      return { ok: true };
    }

    if (cmd.command === 'captionsOn' || cmd.command === 'captionsOff') {
      const btn = document.querySelector<HTMLButtonElement>(SELECTORS.subtitlesButton);
      if (!btn) return { ok: false, reason: 'no captions button' };
      const tip = (btn.getAttribute('data-title-no-tooltip') ?? '').toLowerCase();
      if (tip.includes(CAPTIONS_UNAVAILABLE_NEEDLE)) {
        return { ok: false, reason: 'no caption track for this video' };
      }
      const isOn = btn.getAttribute('aria-pressed') === 'true';
      const wantOn = cmd.command === 'captionsOn';
      if (isOn !== wantOn) btn.click();
      return { ok: true };
    }

    if (cmd.command === 'exitFullscreen') {
      // Only exit is supported: *entering* fullscreen needs transient user
      // activation, which a voice-driven programmatic action lacks, so Chrome
      // blocks it. Exiting has no such requirement and always works.
      if (document.fullscreenElement == null) return { ok: true };
      if (typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen().catch(() => undefined);
        return { ok: true };
      }
      const btn = document.querySelector<HTMLButtonElement>(SELECTORS.fullscreenButton);
      if (btn) btn.click();
      return { ok: true };
    }

    const v = this.getVideo();
    if (!v) return { ok: false, reason: 'no video element' };

    if (this.isAdPlaying() && isSeekCommand(cmd.command)) {
      return { ok: false, reason: 'ad-playing' };
    }

    switch (cmd.command) {
      case 'play': {
        const api = await callPlayerApi('playVideo');
        if (api.ok) return { ok: true };
        await v.play().catch(() => undefined);
        return { ok: true };
      }
      case 'pause': {
        const api = await callPlayerApi('pauseVideo');
        if (api.ok) return { ok: true };
        v.pause();
        return { ok: true };
      }
      case 'mute':
        await callPlayerApi('mute');
        v.muted = true;
        return { ok: true };
      case 'unmute':
        await callPlayerApi('unMute');
        v.muted = false;
        return { ok: true };
      case 'skipRelative': {
        const next = clamp(v.currentTime + cmd.seconds, 0, v.duration || Infinity);
        const api = await callPlayerApi('seekTo', [next, true]);
        if (api.ok) return { ok: true };
        v.currentTime = next;
        return { ok: true };
      }
      case 'jumpToTime': {
        const next = clamp(cmd.seconds, 0, v.duration || Infinity);
        const api = await callPlayerApi('seekTo', [next, true]);
        if (api.ok) return { ok: true };
        v.currentTime = next;
        return { ok: true };
      }
      case 'replay': {
        const seekApi = await callPlayerApi('seekTo', [0, true]);
        if (seekApi.ok) {
          await callPlayerApi('playVideo');
          return { ok: true };
        }
        v.currentTime = 0;
        await v.play().catch(() => undefined);
        return { ok: true };
      }
      case 'speedUp':
        v.playbackRate = clamp(v.playbackRate + SPEED_STEP, SPEED_MIN, SPEED_MAX);
        return { ok: true };
      case 'speedDown':
        v.playbackRate = clamp(v.playbackRate - SPEED_STEP, SPEED_MIN, SPEED_MAX);
        return { ok: true };
      case 'setSpeed': {
        const rate = clamp(cmd.speed, SPEED_MIN, SPEED_MAX);
        const api = await callPlayerApi('setPlaybackRate', [rate]);
        if (api.ok) { v.playbackRate = rate; return { ok: true }; }
        v.playbackRate = rate;
        return { ok: true };
      }
      case 'volumeUp':
        await this.applyVolume(v, (await this.readVolume(v)) + VOLUME_STEP);
        return { ok: true };
      case 'volumeDown':
        await this.applyVolume(v, (await this.readVolume(v)) - VOLUME_STEP);
        return { ok: true };
      case 'setVolume':
        await this.applyVolume(v, cmd.volumePct / 100);
        return { ok: true };
      default: {
        const _exhaustive: never = cmd;
        return { ok: false, reason: `unhandled command: ${JSON.stringify(_exhaustive)}` };
      }
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isVisible(el: HTMLElement): boolean {
  if (typeof el.getClientRects !== 'function') return true;
  if (el.getClientRects().length === 0) return false;
  return true;
}

function isSeekCommand(c: YTCommand['command']): boolean {
  return c === 'skipRelative' || c === 'jumpToTime' || c === 'replay';
}
