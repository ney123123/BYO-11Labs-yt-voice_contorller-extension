import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ContentApp } from './ContentApp';
import './styles.css';

const HOST_ID = 'ytv-host';
const VIDEO_WAIT_MS = 5000;

function mount(): Root | null {
  if (document.getElementById(HOST_ID)) return null;
  const host = document.createElement('div');
  host.id = HOST_ID;
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(<StrictMode><ContentApp /></StrictMode>);
  return root;
}

function unmount(root: Root | null) {
  root?.unmount();
  document.getElementById(HOST_ID)?.remove();
}

let root: Root | null = null;

function isWatchPage(): boolean {
  return location.pathname === '/watch';
}

function waitForElement(selector: string, timeoutMs: number): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);
    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { obs.disconnect(); resolve(el); }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); resolve(document.querySelector(selector)); }, timeoutMs);
  });
}

async function syncMount() {
  if (!isWatchPage()) {
    if (root) { unmount(root); root = null; }
    return;
  }
  await waitForElement('#movie_player video', VIDEO_WAIT_MS);
  if (!isWatchPage()) return;
  if (!root) root = mount();
}

void syncMount();

document.addEventListener('yt-navigate-finish', () => void syncMount());

const nav = (window as unknown as { navigation?: { addEventListener: (type: string, cb: () => void) => void } }).navigation;
if (nav) {
  nav.addEventListener('navigate', () => void syncMount());
} else {
  window.addEventListener('popstate', () => void syncMount());
}
