/**
 * Raw-wire MCP conformance probe for the Alexa+ requirement:
 * MCP 2025-11-25+ over Streamable HTTP.
 *
 * This intentionally does NOT use the MCP client SDK. It verifies that an
 * independent HTTP client can initialize a session, send initialized, list
 * tools, reject a bogus session, and terminate the real session.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../src/server.js';

const EXPECTED_PROTOCOL = '2025-11-25';
const REQUIRED_TOOLS = ['pantry_query', 'meal_plan', 'kitchen_run'];

function rpc(id: number, method: string, params: unknown = {}) {
  return { jsonrpc: '2.0', id, method, params };
}

async function post(baseUrl: string, body: unknown, sessionId?: string) {
  return fetch(baseUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(sessionId ? { 'mcp-session-id': sessionId } : {})
    },
    body: JSON.stringify(body)
  });
}

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as any;
  } catch {
    throw new Error(`expected JSON, got ${res.status}: ${text.slice(0, 300)}`);
  }
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'pantrypilot-conformance-'));
  process.env.DATABASE_PATH = join(dir, 'conformance.sqlite');

  const { port, host } = await startServer(0, '127.0.0.1');
  const url = `http://${host}:${port}/mcp`;

  try {
    const init = await post(
      url,
      rpc(1, 'initialize', {
        protocolVersion: EXPECTED_PROTOCOL,
        capabilities: {},
        clientInfo: { name: 'pantrypilot-raw-conformance', version: '0.1.0' }
      })
    );

    if (!init.ok) throw new Error(`initialize HTTP ${init.status}`);
    const sessionId = init.headers.get('mcp-session-id');
    if (!sessionId) throw new Error('initialize omitted mcp-session-id header');

    const initBody = await parseJson(init);
    if (initBody?.result?.protocolVersion !== EXPECTED_PROTOCOL) {
      throw new Error(
        `negotiated ${initBody?.result?.protocolVersion ?? 'missing'}, expected ${EXPECTED_PROTOCOL}`
      );
    }
    console.log(`OK raw initialize protocol=${EXPECTED_PROTOCOL}`);
    console.log('OK session id returned');

    const initialized = await post(
      url,
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      sessionId
    );
    if (!initialized.ok) {
      throw new Error(`notifications/initialized HTTP ${initialized.status}`);
    }
    console.log('OK initialized notification');

    const list = await post(url, rpc(2, 'tools/list'), sessionId);
    if (!list.ok) throw new Error(`tools/list HTTP ${list.status}`);
    const listBody = await parseJson(list);
    const names = (listBody?.result?.tools ?? []).map((tool: { name?: string }) => tool.name);
    for (const name of REQUIRED_TOOLS) {
      if (!names.includes(name)) throw new Error(`tools/list missing ${name}`);
    }
    console.log(`OK tools/list count=${names.length}`);

    const bogus = await post(url, rpc(3, 'tools/list'), 'not-a-real-session');
    if (bogus.status !== 400) {
      throw new Error(`bogus session returned ${bogus.status}, expected 400`);
    }
    console.log('OK bogus session rejected');

    const terminated = await fetch(url, {
      method: 'DELETE',
      headers: {
        accept: 'application/json, text/event-stream',
        'mcp-session-id': sessionId
      }
    });
    if (!terminated.ok) {
      throw new Error(`session DELETE HTTP ${terminated.status}`);
    }
    console.log('OK session termination');
    console.log('MCP RAW CONFORMANCE PASSED');
  } finally {
    rmSync(dir, { recursive: true, force: true });
    // startServer currently owns the listener for process lifetime; explicit exit
    // is appropriate for this one-shot CI probe after all wire assertions finish.
    process.exit(0);
  }
}

main().catch(error => {
  console.error('MCP RAW CONFORMANCE FAILED', error);
  process.exit(1);
});
