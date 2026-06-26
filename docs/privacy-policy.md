# YT Voice Privacy Policy

**Effective:** 2026-06-25

YT Voice is a Chrome extension that adds voice control to YouTube watch pages.

## What we process

- **Microphone audio** is streamed in real time to ElevenLabs (https://elevenlabs.io) for speech-to-text and intent classification while a YouTube watch page is open and the extension is enabled. Audio leaves your device only over an encrypted connection established with ElevenLabs.
- **Your ElevenLabs Agent ID** is stored in `chrome.storage.local` on your own device so the extension knows which voice agent to connect to. It is not transmitted to us — the extension connects directly to ElevenLabs with it.

## What we do NOT do

- **We operate no backend.** The extension connects directly from your browser to your configured ElevenLabs agent; your audio and commands never pass through any server we control.
- We do not store your voice transcripts, raw audio, or watch history.
- We do not collect an install identifier or any analytics, and we do not sell or share any data with third parties beyond ElevenLabs as described above.
- We do not require an account or sign-in with us.

## How to revoke

- Toggle "Voice control" off in the extension popup to stop streaming.
- Clear the Agent ID in the popup, or uninstall the extension to remove all locally stored settings from your browser.

## Third-party notices

- Speech recognition and intent processing are provided by ElevenLabs under their Terms of Service and Privacy Policy. Data handling on the ElevenLabs side is governed by your own ElevenLabs account and agent configuration.
