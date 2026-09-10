# Friction Log

## 2026-09-10 — Scaffolding Streamable HTTP MCP for Alexa+ (PantryPilot)

**Context:** Greenfield TypeScript MCP server for Amazon Developer Hackathon Alexa+ track. Requirement: `@modelcontextprotocol/sdk` with `protocolVersion` **2025-11-25**.

**What happened:**
- Official TypeScript SDK has split into v2 packages (`@modelcontextprotocol/server`, `@modelcontextprotocol/node`, …) targeting the **2026-07-28** stateless revision. The hackathon brief pins **2025-11-25**, which is still the `LATEST_PROTOCOL_VERSION` exported by the maintained monolith **`@modelcontextprotocol/sdk@1.30.0`**.
- Docs and blog posts push `createMcpHandler` / v2 adapters; for 2025-11-25 clients the working path is still `McpServer` + `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/*`, with Express via `createMcpExpressApp`.
- Choosing **stateful sessions + `enableJsonResponse: true`** made smoke testing with `Client` + `StreamableHTTPClientTransport` straightforward (JSON initialize/result instead of SSE parsing quirks).
- Binding Docker to `0.0.0.0` requires setting `ALLOWED_HOSTS` — `createMcpExpressApp` enables DNS-rebinding Host checks for localhost by default and warns when binding all interfaces without an allow-list.

**Workaround / decision:** Stay on `@modelcontextprotocol/sdk@^1.30.0` (not v2) so initialize negotiates `2025-11-25` natively. Use JSON-response Streamable HTTP with per-session transport map. Household domain state is a separate in-memory map keyed by `householdId` (and optionally bound to MCP `sessionId`), so app state survives independent of transport mode.

**Gap vs v2:** Not using `@modelcontextprotocol/server` `createMcpHandler` / fully stateless 2026-07-28 wire format. If Alexa+ later requires that revision, migrate with the official v1→v2 codemod and re-verify protocol negotiation.
