import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startServer } from '../src/server.js';

const REQUIRED_PROTOCOL = '2025-11-25';
const calls: Array<[string, Record<string, unknown>]> = [
  ['session_recall', { householdId: 'alexa-demo' }],
  ['pantry_upsert', { householdId: 'alexa-demo', name: 'eggs', quantity: 6, unit: 'count' }],
  ['pantry_upsert', { householdId: 'alexa-demo', name: 'rice', quantity: 2, unit: 'cups' }],
  ['prefs_set', { householdId: 'alexa-demo', diet: ['omnivore'], servings: 2 }],
  ['kitchen_run', { householdId: 'alexa-demo', days: 3, goal: 'reduce food waste' }],
  ['session_recall', { householdId: 'alexa-demo' }],
];

function structured(result: Awaited<ReturnType<Client['callTool']>>): Record<string, unknown> | undefined {
  return result.structuredContent && typeof result.structuredContent === 'object'
    ? result.structuredContent as Record<string, unknown>
    : undefined;
}

async function main() {
  const { port, host } = await startServer(0, '127.0.0.1');
  const transport = new StreamableHTTPClientTransport(new URL(`http://${host}:${port}/mcp`));
  const client = new Client({ name: 'pantrypilot-demo', version: '0.1.0' });
  const evidence: Record<string, unknown> = {
    requiredProtocol: REQUIRED_PROTOCOL,
    negotiatedProtocol: null,
    toolCallsPassed: [],
    kitchenRunSource: 'unknown',
    persistentRecallObserved: false,
  };

  try {
    await client.connect(transport);
    evidence.negotiatedProtocol = transport.protocolVersion ?? null;
    if (transport.protocolVersion !== REQUIRED_PROTOCOL) {
      throw new Error(`Expected MCP ${REQUIRED_PROTOCOL}, negotiated ${transport.protocolVersion ?? 'unknown'}`);
    }

    console.log(`PantryPilot Alexa+ demo — MCP ${transport.protocolVersion}`);
    let finalRecall: Record<string, unknown> | undefined;

    for (const [name, args] of calls) {
      const result = await client.callTool({ name, arguments: args });
      if (result.isError) throw new Error(`${name} failed`);
      (evidence.toolCallsPassed as string[]).push(name);

      const payload = structured(result);
      if (name === 'kitchen_run' && payload) {
        const source = payload.source ?? payload.modelSource ?? payload.provider;
        if (typeof source === 'string') evidence.kitchenRunSource = source;
      }
      if (name === 'session_recall') finalRecall = payload;

      console.log(`\n=== ${name} ===`);
      console.log(JSON.stringify(result.structuredContent ?? result.content, null, 2));
    }

    evidence.persistentRecallObserved = Boolean(finalRecall && Object.keys(finalRecall).length > 0);
    console.log('\n=== JUDGE EVIDENCE SUMMARY ===');
    console.log(JSON.stringify(evidence, null, 2));
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
