/**
 * Smoke: initialize negotiates protocolVersion 2025-11-25 and tools/list is non-empty.
 * Spawns an ephemeral server so `npm run smoke` works without a separate start.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { startServer } from '../src/server.js';

const EXPECTED = '2025-11-25';
const REQUIRED_TOOLS = [
  'pantry_upsert',
  'pantry_query',
  'prefs_set',
  'prefs_get',
  'meal_plan',
  'shop_list_build',
  'product_search',
  'cart_draft',
  'cart_confirm',
  'session_recall',
  'kitchen_run'
];

async function main() {
  if (LATEST_PROTOCOL_VERSION !== EXPECTED) {
    throw new Error(
      `SDK LATEST_PROTOCOL_VERSION is ${LATEST_PROTOCOL_VERSION}, expected ${EXPECTED}`
    );
  }

  // Isolated SQLite file for smoke (no secrets; local temp)
  const dir = mkdtempSync(join(tmpdir(), 'pantrypilot-smoke-'));
  process.env.DATABASE_PATH = join(dir, 'smoke.sqlite');

  const { port, host } = await startServer(0, '127.0.0.1');
  const url = `http://${host}:${port}/mcp`;

  const client = new Client({ name: 'pantrypilot-smoke', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url));

  try {
    await client.connect(transport);

    const negotiated = transport.protocolVersion;
    if (negotiated !== EXPECTED) {
      throw new Error(`initialize protocolVersion=${negotiated}, expected ${EXPECTED}`);
    }
    console.log(`OK initialize protocolVersion=${negotiated}`);

    const tools = await client.listTools();
    if (!tools.tools?.length) {
      throw new Error('tools/list returned empty tool list');
    }
    const names = tools.tools.map(t => t.name).sort();
    console.log(`OK tools/list count=${tools.tools.length}`);
    console.log('tools:', names.join(', '));

    for (const required of REQUIRED_TOOLS) {
      if (!names.includes(required)) {
        throw new Error(`missing required tool: ${required}`);
      }
    }
    console.log('OK required tools present (incl. kitchen_run)');

    const resources = await client.listResources();
    const resourceUris = (resources.resources ?? []).map((r) => r.uri);
    if (!resourceUris.some((u) => u.startsWith('pantry://'))) {
      throw new Error(`expected pantry:// resources, got ${JSON.stringify(resourceUris)}`);
    }
    console.log(`OK resources/list count=${resourceUris.length}`);

    const prompts = await client.listPrompts();
    const promptNames = (prompts.prompts ?? []).map((p) => p.name).sort();
    for (const required of ['use_up_expiring', 'weekly_kitchen']) {
      if (!promptNames.includes(required)) {
        throw new Error(`missing required prompt: ${required}`);
      }
    }
    console.log(`OK prompts/list ${promptNames.join(', ')}`);


    const recall = await client.callTool({
      name: 'session_recall',
      arguments: { householdId: 'smoke-home' }
    });
    if (recall.isError) {
      throw new Error(`session_recall failed: ${JSON.stringify(recall)}`);
    }
    console.log('OK session_recall');

    const upsert = await client.callTool({
      name: 'pantry_upsert',
      arguments: {
        householdId: 'smoke-home',
        items: [{ name: 'milk', quantity: 1, unit: 'L', expiresAt: '2026-10-16' }]
      }
    });
    if (upsert.isError) {
      throw new Error(`pantry_upsert failed: ${JSON.stringify(upsert)}`);
    }
    console.log('OK pantry_upsert');

    const run = await client.callTool({
      name: 'kitchen_run',
      arguments: { householdId: 'smoke-home', days: 2, goal: 'weekly' }
    });
    if (run.isError) {
      throw new Error(`kitchen_run failed: ${JSON.stringify(run)}`);
    }
    const text = Array.isArray(run.content)
      ? run.content.map((c: { text?: string }) => c.text ?? '').join('')
      : '';
    if (!text.includes('"ok"') || !text.includes('steps')) {
      throw new Error(`kitchen_run unexpected payload: ${text.slice(0, 400)}`);
    }
    console.log('OK kitchen_run');

    console.log(`OK DATABASE_PATH=${process.env.DATABASE_PATH}`);
    console.log('SMOKE PASSED');
  } finally {
    await client.close().catch(() => undefined);
    // Process exit tears down the listen socket.
    process.exit(0);
  }
}

main().catch(err => {
  console.error('SMOKE FAILED', err);
  process.exit(1);
});
