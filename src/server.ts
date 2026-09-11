/**
 * PantryPilot MCP — Streamable HTTP server (protocol 2025-11-25).
 * Uses @modelcontextprotocol/sdk McpServer + StreamableHTTPServerTransport.
 */
import { randomUUID } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { Request, Response } from 'express';
import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { initDatabase, persistDatabaseNow, resolveDatabasePath } from './db.js';
import { registerTools } from './tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve companion static dir (dev: ../apps/companion, prod: ../apps/companion next to dist). */
function resolveCompanionDir(): string | null {
  const candidates = [
    join(__dirname, '..', 'apps', 'companion'),
    join(process.cwd(), 'apps', 'companion')
  ];
  for (const c of candidates) {
    if (existsSync(join(c, 'index.html'))) return c;
  }
  return null;
}

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS ?? 'localhost,127.0.0.1,::1')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export function createPantryPilotServer(): McpServer {
  const server = new McpServer(
    { name: 'pantrypilot-mcp', version: '0.1.0' },
    {
      instructions:
        'PantryPilot helps manage household pantry inventory, preferences, meal plans, shopping lists, and mock cart drafts over MCP. Prefer kitchen_run for a full pantry→meal→shop→cart agent loop. State is durable in SQLite (DATABASE_PATH). Pass householdId on tools when multi-home; otherwise session binding is used. meal_plan uses Amazon Bedrock when AWS_REGION and BEDROCK_MODEL_ID are set; otherwise a deterministic stub. Product and meal responses include structured mediaCard payloads.'
    }
  );
  registerTools(server);
  return server;
}

const transports = new Map<string, StreamableHTTPServerTransport>();

export function createApp() {
  const app = createMcpExpressApp({ host: HOST, allowedHosts: ALLOWED_HOSTS });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, name: 'pantrypilot-mcp', protocol: '2025-11-25', databasePath: resolveDatabasePath(), companion: '/companion/' });
  });

  const companionDir = resolveCompanionDir();
  if (companionDir) {
    app.use('/companion', express.static(companionDir, { index: 'index.html' }));
    app.get('/', (_req, res) => { res.redirect(302, '/companion/'); });
  }

  const mcpHandler = async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport | undefined;

      if (sessionId && transports.has(sessionId)) {
        transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: id => { transports.set(id, transport!); }
        });
        transport.onclose = () => {
          const sid = transport?.sessionId;
          if (sid) transports.delete(sid);
        };
        const server = createPantryPilotServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: No valid session ID provided' }, id: null });
    } catch (error) {
      console.error('[pantrypilot] MCP handler error:', error);
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  };

  app.post('/mcp', mcpHandler);
  app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(405).set('Allow', 'POST').send('Method Not Allowed');
      return;
    }
    await transports.get(sessionId)!.handleRequest(req, res);
  });
  app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      const t = transports.get(sessionId)!;
      await t.handleRequest(req, res);
      transports.delete(sessionId);
      return;
    }
    res.status(405).set('Allow', 'POST').send('Method Not Allowed');
  });

  return app;
}

export async function startServer(
  port = PORT,
  host = HOST
): Promise<{ port: number; host: string; server: HttpServer }> {
  await initDatabase();
  const app = createApp();
  return new Promise((resolve, reject) => {
    const httpServer = app.listen(port, host, (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      const addr = httpServer.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      console.log(`PantryPilot MCP Streamable HTTP listening on http://${host}:${actualPort}/mcp (protocol 2025-11-25)`);
      if (resolveCompanionDir()) console.log(`Companion UI: http://${host}:${actualPort}/companion/`);
      resolve({ port: actualPort, host, server: httpServer });
    });

    const shutdown = () => {
      try { persistDatabaseNow(); } catch { /* ignore */ }
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js') || process.argv[1].includes('/server.'));

if (isMain) {
  startServer().catch(err => {
    console.error('Failed to start PantryPilot MCP:', err);
    process.exit(1);
  });
}
