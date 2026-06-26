/**
 * One-time provisioner: creates the executeYTCommand client tool and a PUBLIC
 * ElevenLabs agent in the caller's own account, then prints the agent_id.
 *
 * "Public" means the agent accepts WebSocket connections by agent_id alone,
 * with no signed URL — which is what the extension needs (it holds no API key).
 * The script sets `platform_settings.auth.enable_auth = false`, then reads the
 * agent back to VERIFY it is public, so you never have to touch the dashboard.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... npx tsx scripts/setup-agent.ts
 *
 * The API key is read from the environment for this single run and is never
 * written to disk. Each invocation creates a fresh tool + agent.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://api.elevenlabs.io/v1/convai';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function requireKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error('Missing ELEVENLABS_API_KEY. Run:\n  ELEVENLABS_API_KEY=sk_... npx tsx scripts/setup-agent.ts');
    process.exit(1);
  }
  return key;
}

async function call(method: string, path: string, key: string, body?: unknown): Promise<any> {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

const post  = (path: string, key: string, body: unknown) => call('POST',  path, key, body);
const patch = (path: string, key: string, body: unknown) => call('PATCH', path, key, body);
const get   = (path: string, key: string)                => call('GET',   path, key);

async function main(): Promise<void> {
  const key = requireKey();

  // 1. Create the client tool from the shipped config.
  const toolConfig = JSON.parse(await readFile(join(root, 'tool_configs/executeYTCommand.json'), 'utf8'));
  const toolResp = await post('/tools', key, { tool_config: toolConfig });
  const toolId: string | undefined = toolResp.id ?? toolResp.tool_id;
  if (!toolId) throw new Error(`tool create returned no id: ${JSON.stringify(toolResp)}`);
  console.log(`✓ created tool: ${toolId}`);

  // 2. Create the agent from the shipped workflow, wired to that tool, with
  //    authentication disabled (public).
  const workflow = JSON.parse(await readFile(join(root, 'agent_configs/workflow.json'), 'utf8'));
  const conversationConfig = workflow.conversation_config;
  conversationConfig.agent.prompt.tool_ids = [toolId];

  const agentResp = await post('/agents/create', key, {
    name: 'yt-voice-workflow',
    conversation_config: conversationConfig,
    platform_settings: { auth: { enable_auth: false } },
  });
  const agentId: string | undefined = agentResp.agent_id ?? agentResp.id;
  if (!agentId) throw new Error(`agent create returned no id: ${JSON.stringify(agentResp)}`);
  console.log(`✓ created agent: ${agentId}`);

  // 3. Re-assert auth-disabled (idempotent) and read the agent back to VERIFY
  //    it is actually public. An empty allowlist means any origin may connect,
  //    which the chrome-extension origin needs.
  await patch(`/agents/${agentId}`, key, { platform_settings: { auth: { enable_auth: false, allowlist: [] } } });
  const agent = await get(`/agents/${agentId}`, key);
  const enableAuth = agent?.platform_settings?.auth?.enable_auth;
  const isPublic = enableAuth === false;

  console.log();
  if (isPublic) {
    console.log('✓ verified PUBLIC — the agent accepts connections by ID (enable_auth=false).');
  } else {
    console.warn(`⚠ could not confirm the agent is public (enable_auth=${JSON.stringify(enableAuth)}).`);
    console.warn('  Open this agent in the ElevenLabs dashboard → Security/Advanced →');
    console.warn('  turn OFF "Enable authentication", then retry.');
  }

  console.log('\nNext steps:');
  console.log('  1. Load the extension: open chrome://extensions → enable "Developer mode"');
  console.log('     → "Load unpacked" → select the `dist/` folder (run `npm run build` first');
  console.log('     if you used `npm run setup` on its own; `npm run quickstart` builds it for you).');
  console.log(`  2. Open the YT Voice popup and paste this Agent ID:\n       ${agentId}`);
  console.log('  3. Grant the microphone when the popup prompts you.');
  console.log('  4. Set a monthly usage cap in the ElevenLabs dashboard (your safety fuse).');
}

main().catch((err) => {
  console.error('\n✗ setup failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
