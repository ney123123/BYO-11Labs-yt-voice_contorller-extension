// Shared name for the window.postMessage channel between the isolated-world
// YTPlayerBridge (ytPlayerBridge.ts) and the MAIN-world bridge
// (playerApiBridge.main.ts). Both worlds import this single source of truth so
// the two halves of the protocol can never drift out of sync.
export const API_CHANNEL = 'ytv-api';
