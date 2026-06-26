export type YTCommand =
  | { command: 'play' }
  | { command: 'pause' }
  | { command: 'mute' }
  | { command: 'unmute' }
  | { command: 'skipRelative'; seconds: number }
  | { command: 'jumpToTime'; seconds: number }
  | { command: 'replay' }
  | { command: 'speedUp' }
  | { command: 'speedDown' }
  | { command: 'setSpeed'; speed: number }
  | { command: 'volumeUp' }
  | { command: 'volumeDown' }
  | { command: 'setVolume'; volumePct: number }
  | { command: 'captionsOn' }
  | { command: 'captionsOff' }
  | { command: 'exitFullscreen' }
  | { command: 'skipAd' }
  | { command: 'noop' };

export type YTCommandName = YTCommand['command'];

export type BridgeResult =
  | { ok: true }
  | { ok: false; reason: string };

export const SKIP_TURN_INSTRUCTION = 'Call skip_turn immediately. Do not speak.';
