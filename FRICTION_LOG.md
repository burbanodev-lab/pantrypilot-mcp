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

## 2026-09-10 — Optional Bedrock meal_plan without breaking stub demos

**Context:** Add an Amazon Bedrock path for `meal_plan` while keeping Docker / smoke / offline demos green with zero AWS credentials.

**What happened:**
- Bedrock Converse (`@aws-sdk/client-bedrock-runtime`) needs region + model id + credentials. Wiring it unconditionally would fail CI/smoke and Docker healthchecks on machines without AWS access.
- Model JSON is free-form text; even with a strict system prompt, responses may wrap in markdown fences or omit fields. Blind trust of the model output would corrupt household `mealPlan` state and break `shop_list_build`.
- Alexa+ demo wants richer companion UI than raw ingredient lists — product/cart/meal payloads needed a shared `mediaCard` shape without inventing a second catalog API.

**Workaround / decision:**
- Gate Bedrock on **`AWS_REGION` + `BEDROCK_MODEL_ID`** (credentials via the normal SDK chain). If either env var is missing, or Converse/parse fails, keep the deterministic stub and return `source: "stub"` (plus `bedrockError` when a call was attempted).
- Normalize/validate Bedrock JSON into `MealSlot`s (`normalizeMealSlot`) before writing state; enrich both stub and Bedrock slots with `description` / `tags` / `estimatedMinutes` / `mediaCard`.
- Docker Compose forwards optional `AWS_*` / `BEDROCK_MODEL_ID` from the host; secrets stay out of the image and git (`.env` gitignored; `.env.example` placeholders only).

**Still rough:** No live Bedrock integration test in `npm run smoke` (would need real credentials and a provisioned model). Structured output / tool-use on Converse would harden JSON reliability further; deferred to keep the MVP path simple.
