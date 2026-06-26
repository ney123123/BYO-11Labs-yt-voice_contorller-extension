const statusEl = document.getElementById('status')!;
const btn = document.getElementById('grant') as HTMLButtonElement;

function setStatus(kind: 'pending' | 'ok' | 'err', html: string): void {
  statusEl.className = `card ${kind}`;
  statusEl.innerHTML = html;
}

async function grant(): Promise<void> {
  setStatus('pending', 'Requesting microphone access from Chrome…');
  btn.disabled = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    setStatus('ok', '<strong>Microphone granted.</strong> You can close this tab and reload any YouTube watch page.');
    btn.textContent = 'Granted';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus('err', `<strong>Failed:</strong> ${escapeHtml(msg)}. Try clicking the button again, or grant the permission via <code>chrome://settings/content/microphone</code>.`);
    btn.disabled = false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

btn.addEventListener('click', () => void grant());

// Auto-trigger on load. If permission is already granted, getUserMedia resolves silently.
void grant();
