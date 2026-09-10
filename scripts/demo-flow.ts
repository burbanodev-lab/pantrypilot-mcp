import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startServer } from '../src/server.js';

const calls: Array<[string, Record<string, unknown>]> = [
  ['session_recall', { householdId: 'alexa-demo' }],
  ['pantry_upsert', { householdId: 'alexa-demo', name: 'eggs', quantity: 6, unit: 'count' }],
  ['pantry_upsert', { householdId: 'alexa-demo', name: 'rice', quantity: 2, unit: 'cups' }],
  ['prefs_set', { householdId: 'alexa-demo', diet: ['omnivore'], servings: 2 }],
  ['kitchen_run', { householdId: 'alexa-demo', days: 3, goal: 'reduce food waste' }],
  ['session_recall', { householdId: 'alexa-demo' }],
];

async function main() {
  const { port, host } = await startServer(0, '127.0.0.1');
  const transport = new StreamableHTTPClientTransport(new URL(`http://${host}:${port}/mcp`));
  const client = new Client({ name: 'pantrypilot-demo', version: '0.1.0' });

  try {
    await client.connect(transport);
    console.log(`PantryPilot Alexa+ demo — MCP ${transport.protocolVersion}`);
    for (const [name, args] of calls) {
      const result = await client.callTool({ name, arguments: args });
      if (result.isError) throw new Error(`${name} failed`);
      console.log(`\n=== ${name} ===`);
      console.log(JSON.stringify(result.structuredContent ?? result.content, null, 2));
    }
    console.log('\nDEMO FLOW PASSED');
  } finally {
    await client.close().catch(() => undefined);
    process.exit(0);
  }
}

main().catch(error => {
  console.error('DEMO FLOW FAILED', error);
  process.exit(1);
});
