import { type YTCommand, type YTCommandName } from '../shared/commands';

export const VALID_COMMANDS: ReadonlySet<YTCommandName> = new Set([
  'play', 'pause', 'mute', 'unmute',
  'skipRelative', 'jumpToTime', 'replay',
  'speedUp', 'speedDown', 'setSpeed',
  'volumeUp', 'volumeDown', 'setVolume',
  'captionsOn', 'captionsOff',
  'exitFullscreen',
  'skipAd', 'noop',
]);

export function parseYTCommand(raw: Record<string, unknown>): YTCommand {
  const name = raw.command;
  if (typeof name !== 'string' || !VALID_COMMANDS.has(name as YTCommandName)) {
    return { command: 'noop' };
  }
  const seconds = typeof raw.seconds === 'number' ? raw.seconds : 0;
  const speed = typeof raw.speed === 'number' ? raw.speed : 1.0;
  const volumePct = typeof raw.volumePct === 'number' ? raw.volumePct : 50;
  switch (name as YTCommandName) {
    case 'skipRelative': return { command: 'skipRelative', seconds };
    case 'jumpToTime':   return { command: 'jumpToTime', seconds };
    case 'setSpeed':     return { command: 'setSpeed', speed };
    case 'setVolume':    return { command: 'setVolume', volumePct };
    default:             return { command: name as Exclude<YTCommandName, 'skipRelative' | 'jumpToTime' | 'setSpeed' | 'setVolume'> };
  }
}
