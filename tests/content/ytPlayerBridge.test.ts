import { describe, it, expect, beforeEach } from 'vitest';
import { YTPlayerBridge } from '../../src/content/ytPlayerBridge';

function makeVideo(opts: Partial<{ duration: number; playing: boolean; muted: boolean; volume: number; speed: number; currentTime: number }> = {}) {
  const v = document.createElement('video');
  Object.defineProperty(v, 'duration', { value: opts.duration ?? 600, configurable: true });
  v.muted = opts.muted ?? false;
  v.volume = opts.volume ?? 0.5;
  v.playbackRate = opts.speed ?? 1.0;
  v.currentTime = opts.currentTime ?? 100;
  let paused = !(opts.playing ?? false);
  Object.defineProperty(v, 'paused', { get: () => paused, configurable: true });
  v.play = async () => { paused = false; };
  v.pause = () => { paused = true; };
  return v;
}

function mountVideo(v: HTMLVideoElement) {
  v.classList.add('html5-main-video');
  let player = document.getElementById('movie_player');
  if (!player) {
    player = document.createElement('div');
    player.id = 'movie_player';
    document.body.appendChild(player);
  }
  let container = player.querySelector('.html5-video-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'html5-video-container';
    player.appendChild(container);
  }
  container.appendChild(v);
}

function setAdPlaying(on: boolean) {
  document.getElementById('movie_player')?.classList.toggle('ad-showing', on);
}

describe('YTPlayerBridge', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('playback', () => {
    it('play resumes a paused video', async () => {
      const v = makeVideo({ playing: false });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'play' });
      expect(r.ok).toBe(true);
      expect(v.paused).toBe(false);
    });

    it('pause stops a playing video', async () => {
      const v = makeVideo({ playing: true });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'pause' });
      expect(r.ok).toBe(true);
      expect(v.paused).toBe(true);
    });

    it('mute / unmute toggle the muted property', async () => {
      const v = makeVideo({ muted: false });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      await bridge.executeCommand({ command: 'mute' });
      expect(v.muted).toBe(true);
      await bridge.executeCommand({ command: 'unmute' });
      expect(v.muted).toBe(false);
    });
  });

  describe('navigation', () => {
    it('skipRelative adds seconds to currentTime', async () => {
      const v = makeVideo({ currentTime: 100, duration: 600 });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      await bridge.executeCommand({ command: 'skipRelative', seconds: 10 });
      expect(v.currentTime).toBe(110);
      await bridge.executeCommand({ command: 'skipRelative', seconds: -30 });
      expect(v.currentTime).toBe(80);
    });

    it('skipRelative clamps to [0, duration]', async () => {
      const v = makeVideo({ currentTime: 5, duration: 600 });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      await bridge.executeCommand({ command: 'skipRelative', seconds: -100 });
      expect(v.currentTime).toBe(0);
      await bridge.executeCommand({ command: 'skipRelative', seconds: 10000 });
      expect(v.currentTime).toBe(600);
    });

    it('jumpToTime sets currentTime absolutely', async () => {
      const v = makeVideo({ currentTime: 100, duration: 600 });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      await bridge.executeCommand({ command: 'jumpToTime', seconds: 200 });
      expect(v.currentTime).toBe(200);
    });

    it('replay sets currentTime to 0 and plays', async () => {
      const v = makeVideo({ currentTime: 300, playing: false });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      await bridge.executeCommand({ command: 'replay' });
      expect(v.currentTime).toBe(0);
      expect(v.paused).toBe(false);
    });
  });

  describe('speed', () => {
    it('setSpeed clamps to [0.25, 2.0]', async () => {
      const v = makeVideo({ speed: 1.0 });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      await bridge.executeCommand({ command: 'setSpeed', speed: 1.5 });
      expect(v.playbackRate).toBe(1.5);
      await bridge.executeCommand({ command: 'setSpeed', speed: 5 });
      expect(v.playbackRate).toBe(2.0);
      await bridge.executeCommand({ command: 'setSpeed', speed: 0.1 });
      expect(v.playbackRate).toBe(0.25);
    });

    it('speedUp / speedDown step by 0.25', async () => {
      const v = makeVideo({ speed: 1.0 });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      await bridge.executeCommand({ command: 'speedUp' });
      expect(v.playbackRate).toBe(1.25);
      await bridge.executeCommand({ command: 'speedDown' });
      expect(v.playbackRate).toBe(1.0);
    });
  });

  describe('volume', () => {
    it('setVolume maps 0..100 to 0..1', async () => {
      const v = makeVideo({ volume: 0.5 });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      await bridge.executeCommand({ command: 'setVolume', volumePct: 80 });
      expect(v.volume).toBeCloseTo(0.8);
    });

    it('volumeUp / volumeDown step by 0.1 and clamp to [0,1]', async () => {
      const v = makeVideo({ volume: 0.95 });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      await bridge.executeCommand({ command: 'volumeUp' });
      expect(v.volume).toBe(1);
      await bridge.executeCommand({ command: 'volumeDown' });
      expect(v.volume).toBeCloseTo(0.9);
    });
  });

  describe('skipAd', () => {
    it('clicks the skip-ad button when present', async () => {
      mountVideo(makeVideo());
      const btn = document.createElement('button');
      btn.className = 'ytp-skip-ad-button';
      let clicked = false;
      btn.addEventListener('click', () => { clicked = true; });
      document.body.appendChild(btn);
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'skipAd' });
      expect(r.ok).toBe(true);
      expect(clicked).toBe(true);
    });

    it('fails cleanly when no skip-ad button exists', async () => {
      mountVideo(makeVideo());
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'skipAd' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/no skippable ad/i);
    });
  });

  describe('captions', () => {
    it('captionsOn clicks subtitles button when aria-pressed=false', async () => {
      mountVideo(makeVideo());
      const btn = document.createElement('button');
      btn.className = 'ytp-subtitles-button';
      btn.setAttribute('aria-pressed', 'false');
      let clicked = false;
      btn.addEventListener('click', () => { clicked = true; btn.setAttribute('aria-pressed', 'true'); });
      document.body.appendChild(btn);
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'captionsOn' });
      expect(r.ok).toBe(true);
      expect(clicked).toBe(true);
    });

    it('captionsOn is a no-op if captions are already on', async () => {
      mountVideo(makeVideo());
      const btn = document.createElement('button');
      btn.className = 'ytp-subtitles-button';
      btn.setAttribute('aria-pressed', 'true');
      let clicked = false;
      btn.addEventListener('click', () => { clicked = true; });
      document.body.appendChild(btn);
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'captionsOn' });
      expect(r.ok).toBe(true);
      expect(clicked).toBe(false);
    });
  });

  describe('exitFullscreen', () => {
    function setFullscreen(el: Element | null) {
      Object.defineProperty(document, 'fullscreenElement', { value: el, configurable: true });
    }
    function stubExitFullscreen() {
      let called = false;
      Object.defineProperty(document, 'exitFullscreen', {
        value: async () => { called = true; },
        configurable: true,
      });
      return () => called;
    }

    it('calls document.exitFullscreen when currently fullscreen', async () => {
      mountVideo(makeVideo());
      const player = document.getElementById('movie_player');
      setFullscreen(player);
      const wasCalled = stubExitFullscreen();
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'exitFullscreen' });
      expect(r.ok).toBe(true);
      expect(wasCalled()).toBe(true);
    });

    it('is a no-op (still ok) when not in fullscreen', async () => {
      mountVideo(makeVideo());
      setFullscreen(null);
      const wasCalled = stubExitFullscreen();
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'exitFullscreen' });
      expect(r.ok).toBe(true);
      expect(wasCalled()).toBe(false);
    });
  });

  describe('missing video', () => {
    it('returns ok:false when no video element exists', async () => {
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'play' });
      expect(r.ok).toBe(false);
    });
  });

  describe('noop', () => {
    it('returns ok:true and changes nothing', async () => {
      const v = makeVideo({ currentTime: 100, volume: 0.5, speed: 1.0 });
      mountVideo(v);
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'noop' });
      expect(r.ok).toBe(true);
      expect(v.currentTime).toBe(100);
      expect(v.volume).toBe(0.5);
      expect(v.playbackRate).toBe(1.0);
    });
  });

  describe('ad state', () => {
    it('skipRelative returns ok:false with reason ad-playing while .ad-showing is set', async () => {
      const v = makeVideo({ currentTime: 100 });
      mountVideo(v);
      setAdPlaying(true);
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'skipRelative', seconds: 10 });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('ad-playing');
      expect(v.currentTime).toBe(100);
    });

    it('jumpToTime and replay also blocked while ad-showing', async () => {
      const v = makeVideo({ currentTime: 50 });
      mountVideo(v);
      setAdPlaying(true);
      const bridge = new YTPlayerBridge();
      expect((await bridge.executeCommand({ command: 'jumpToTime', seconds: 200 })).ok).toBe(false);
      expect((await bridge.executeCommand({ command: 'replay' })).ok).toBe(false);
      expect(v.currentTime).toBe(50);
    });

    it('non-seek commands still work during an ad', async () => {
      const v = makeVideo({ playing: true, volume: 0.5 });
      mountVideo(v);
      setAdPlaying(true);
      const bridge = new YTPlayerBridge();
      expect((await bridge.executeCommand({ command: 'pause' })).ok).toBe(true);
      expect(v.paused).toBe(true);
      expect((await bridge.executeCommand({ command: 'setVolume', volumePct: 80 })).ok).toBe(true);
      expect(v.volume).toBeCloseTo(0.8);
    });
  });

  describe('captions unavailable', () => {
    it('returns ok:false when subtitles button has data-title-no-tooltip containing "unavailable"', async () => {
      mountVideo(makeVideo());
      const btn = document.createElement('button');
      btn.className = 'ytp-subtitles-button';
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('data-title-no-tooltip', 'Subtitles/closed captions unavailable');
      let clicked = false;
      btn.addEventListener('click', () => { clicked = true; });
      document.body.appendChild(btn);
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'captionsOn' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/no caption track/i);
      expect(clicked).toBe(false);
    });
  });

  describe('skipAd modern class', () => {
    it('clicks .ytp-ad-skip-button-modern when present', async () => {
      mountVideo(makeVideo());
      const btn = document.createElement('button');
      btn.className = 'ytp-ad-skip-button-modern';
      let clicked = false;
      btn.addEventListener('click', () => { clicked = true; });
      document.body.appendChild(btn);
      const bridge = new YTPlayerBridge();
      const r = await bridge.executeCommand({ command: 'skipAd' });
      expect(r.ok).toBe(true);
      expect(clicked).toBe(true);
    });
  });

  describe('video element replacement', () => {
    it('re-resolves currentVideo after the <video> is replaced in the container', async () => {
      const v1 = makeVideo({ currentTime: 100 });
      mountVideo(v1);
      const bridge = new YTPlayerBridge();
      await bridge.executeCommand({ command: 'pause' });

      const container = document.querySelector('#movie_player .html5-video-container')!;
      container.removeChild(v1);
      const v2 = makeVideo({ currentTime: 0, playing: false });
      v2.classList.add('html5-main-video');
      container.appendChild(v2);

      await new Promise<void>((r) => setTimeout(r, 0));

      await bridge.executeCommand({ command: 'play' });
      expect(v2.paused).toBe(false);
      expect(v1.paused).toBe(true);
      bridge.dispose();
    });
  });
});
