import { describe, it, expect } from 'vitest';
import { parseYTCommand } from '../../src/content/commandTools';

describe('parseYTCommand', () => {
  it('passes through valid simple commands', () => {
    expect(parseYTCommand({ command: 'play' })).toEqual({ command: 'play' });
    expect(parseYTCommand({ command: 'skipAd' })).toEqual({ command: 'skipAd' });
    expect(parseYTCommand({ command: 'noop' })).toEqual({ command: 'noop' });
  });

  it('parses parameterized commands', () => {
    expect(parseYTCommand({ command: 'skipRelative', seconds: 10 })).toEqual({ command: 'skipRelative', seconds: 10 });
    expect(parseYTCommand({ command: 'jumpToTime', seconds: 200 })).toEqual({ command: 'jumpToTime', seconds: 200 });
    expect(parseYTCommand({ command: 'setSpeed', speed: 1.5 })).toEqual({ command: 'setSpeed', speed: 1.5 });
    expect(parseYTCommand({ command: 'setVolume', volumePct: 80 })).toEqual({ command: 'setVolume', volumePct: 80 });
  });

  it('defaults to noop on unknown command', () => {
    expect(parseYTCommand({ command: 'totallyBogus' })).toEqual({ command: 'noop' });
  });

  it('defaults to noop on missing command field', () => {
    expect(parseYTCommand({})).toEqual({ command: 'noop' });
  });

  it('uses default arg values when missing', () => {
    expect(parseYTCommand({ command: 'skipRelative' })).toEqual({ command: 'skipRelative', seconds: 0 });
    expect(parseYTCommand({ command: 'setSpeed' })).toEqual({ command: 'setSpeed', speed: 1 });
    expect(parseYTCommand({ command: 'setVolume' })).toEqual({ command: 'setVolume', volumePct: 50 });
  });
});
