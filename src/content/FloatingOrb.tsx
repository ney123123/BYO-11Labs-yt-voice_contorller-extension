import { type FC } from 'react';

export type OrbState = 'idle' | 'connecting' | 'listening' | 'executing' | 'noop' | 'error';

export interface FloatingOrbProps {
  state: OrbState;
  errorMessage?: string;
  onClick?: () => void;
}

export const FloatingOrb: FC<FloatingOrbProps> = ({ state, errorMessage, onClick }) => {
  const title = state === 'error' && errorMessage ? errorMessage : `voice: ${state}`;
  return (
    <button
      type="button"
      className={`ytv-orb ytv-orb--${state}`}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      <span className="ytv-orb__glyph">{glyphFor(state)}</span>
    </button>
  );
};

function glyphFor(state: OrbState): string {
  switch (state) {
    case 'idle':       return '·';
    case 'connecting': return '◌';
    case 'listening':  return '◉';
    case 'executing':  return '✓';
    case 'noop':       return '?';
    case 'error':      return '!';
  }
}
