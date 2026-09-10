/**
 * Smoke: initialize negotiates protocolVersion 2025-11-25 and tools/list is non-empty.
 * Spawns an ephemeral server so `npm run smoke` works without a separate start.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { startServer } from '../src/server.js';

const EXPECTED = '2025-11-25';

async function main() {
  if (LATEST_PROTOCOL_VERSION !== EXPECTED) {
    throw new Error(
      `SDK LATEST_PROTOCOL_VERSION is ${LATEST_PROTOCOL_VERSION}, expected ${EXPECTED}`
    );
  }

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
    console.log(`OK tools/list count=${tools.tools.length}`);
    console.log(
      'tools:',
      tools.tools.map(t => t.name).sort().join(', ')
    );

    // Light functional probe
    const recall = await client.callTool({
      name: 'session_recall',
      arguments: { householdId: 'smoke-home' }
    });
    if (recall.isError) {
      throw new Error(`session_recall failed: ${JSON.stringify(recall)}`);
    }
    console.log('OK session_recall');

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
