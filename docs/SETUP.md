# Setup: your own ElevenLabs agent

## Fast path (script)

```bash
ELEVENLABS_API_KEY=sk_... npm run setup
```

This creates the `executeYTCommand` client tool and a **public** agent in your
account and prints an `agent_…` ID. Paste that ID into the extension popup.

The API key is used only for this one command and is never written to disk or
bundled into the extension. The running extension connects to your agent by ID
over a public WebSocket — it never sees your key.

## Manual path (dashboard)

1. Conversational AI → Agents → Create agent.
2. Paste the system prompt from `agent_configs/workflow.json`
   (`conversation_config.agent.prompt.prompt`).
3. Tools → add a **client tool** named `executeYTCommand` matching
   `tool_configs/executeYTCommand.json` (same parameter enum).
4. Enable the **skip_turn** system tool.
5. Security → turn **Enable authentication OFF** so the extension can connect
   with just the agent ID.
6. Copy the agent ID into the extension popup.

## Troubleshooting

- **Orb says "Set your ElevenLabs Agent ID"** — the popup field is empty or the
  value isn't a valid `agent_…` ID.
- **Connects then errors with an auth/401 message** — the agent still requires
  authentication. In the dashboard, turn off "Security → Enable authentication".
- **Spend** — a public agent is usable by anyone who has its ID. Keep the ID
  private and set the agent's monthly hard cap in the dashboard.
