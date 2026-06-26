import { useEffect, useState, type FC } from 'react';

export interface TranscriptBubbleProps {
  text: string | null;
  durationMs?: number;
}

export const TranscriptBubble: FC<TranscriptBubbleProps> = ({ text, durationMs = 1500 }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!text) { setVisible(false); return; }
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(t);
  }, [text, durationMs]);

  if (!text || !visible) return null;
  return <div className="ytv-bubble">→ {text}</div>;
};
