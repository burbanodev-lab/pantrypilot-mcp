import { existsSync, readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startServer } from '../src/server.js';

const EXPECTED_PROTOCOL = '2025-11-25';
const REQUIRED_FILES = ['LICENSE', 'README.md', 'SUBMISSION.md', 'src/server.ts'];
const REQUIRED_TOOLS = ['meal_plan', 'kitchen_run', 'pantry_upsert', 'session_recall'];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  for (const file of REQUIRED_FILES) assert(existsSync(file), `missing required file: ${file}`);

  const readme = readFileSync('README.md', 'utf8');
  assert(/Bedrock/i.test(readme), 'README must document Amazon Bedrock integration');
  assert(/2025-11-25/.test(readme), 'README must document MCP protocol 2025-11-25');
  assert(/Streamable HTTP/i.test(readme), 'README must document Streamable HTTP');

  const { port, host } = await startServer(0, '127.0.0.1');
  const transport = new StreamableHTTPClientTransport(new URL(`http://${host}:${port}/mcp`));
  const client = new Client({ name: 'pantrypilot-judge-check', version: '0.1.0' });

  try {
    await client.connect(transport);
    assert(transport.protocolVersion === EXPECTED_PROTOCOL,
      `negotiated ${transport.protocolVersion}; expected ${EXPECTED_PROTOCOL}`);

    const listed = await client.listTools();
    const names = listed.tools.map(tool => tool.name);
    for (const tool of REQUIRED_TOOLS) assert(names.includes(tool), `missing judge-critical tool: ${tool}`);

    const run = await client.callTool({
      name: 'kitchen_run',
      arguments: { householdId: 'judge-demo', days: 2, goal: 'use_expiring' }
    });
    assert(!run.isError, 'kitchen_run returned an MCP error');

    console.log(JSON.stringify({
      status: 'JUDGE_CHECK_PASSED',
      protocol: transport.protocolVersion,
      toolCount: names.length,
      requiredTools: REQUIRED_TOOLS,
      bedrockDocumented: true,
      submissionMetadataPresent: true
    }, null, 2));
  } finally {
    // Never call process.exit() here: doing so masks exceptions thrown above and
    // makes a broken judge path look green in CI. Let failures reach main().catch.
    await client.close().catch(() => undefined);
  }
}

main().catch(error => {
  console.error('JUDGE_CHECK_FAILED', error);
  process.exitCode = 1;
});
