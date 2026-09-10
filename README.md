# PantryPilot MCP

Greenfield **TypeScript** [Model Context Protocol](https://modelcontextprotocol.io) server for the **Amazon Developer Hackathon — Alexa+ track**.

PantryPilot exposes household pantry, preferences, meal planning, shopping list, product search (mock catalog with card fields), and cart draft/confirm tools over **Streamable HTTP**. Protocol version negotiated on `initialize`: **`2025-11-25`**.

AWS credentials are **optional**. Without `AWS_REGION` + `BEDROCK_MODEL_ID`, `meal_plan` uses a deterministic stub so local demos and Docker still work offline.



## GenAI Open Agent 2026

- **Track intent:** 05 Real-World Industry Agents (household kitchen ops); backup 04 Persistent Memory
- **Baseline tag:** `baseline/pre-genai-2026-10-14` — see [`PREEXISTING.md`](./PREEXISTING.md)
- **Scored branch:** `genai/open-agent-2026`
- **Durable memory:** SQLite via `sql.js` at `DATABASE_PATH` (default `./data/pantrypilot.sqlite`)
- **Agent entrypoint:** MCP tool `kitchen_run`
- **Companion UI:** `apps/companion` served at `/companion/` (static MCP client + media cards)
- **Evals / failure modes:** `npm run eval` · [`FAILURE_MODES.md`](./FAILURE_MODES.md)
- **One-command:** `docker compose up --build` (volume `pantrypilot-data` mounts `/data`)

## Architecture

```
Alexa+ / MCP client
        │  POST /mcp  (Streamable HTTP, JSON responses)
        ▼
┌───────────────────────────────┐
│  Express (createMcpExpressApp)│
│  StreamableHTTPServerTransport│  ← @modelcontextprotocol/sdk
│  McpServer + tools            │
└───────────────┬───────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
 SQLite household      Optional Amazon Bedrock
 store (DATABASE_PATH; (Converse via
  + memory cache)      @aws-sdk/client-bedrock-runtime)
        │                │
        ▼                ▼
 Mock product catalog   Structured meal slots
 (ASIN + mediaCard)     + mediaCard payloads
```

| Layer | Role |
|-------|------|
| `src/server.ts` | Entry: Streamable HTTP, session map, `/mcp` + `/health` + `/companion/` |
| `src/tools.ts` | Eleven MCP tools (incl. `kitchen_run`) |
| `apps/companion/` | Minimal web companion (HTML/JS) calling `kitchen_run` + rendering `mediaCard`s |
| `evals/` | Scripted happy-path + soft-failure eval (`npm run eval`) |
| `src/state.ts` / `src/db.ts` | Household pantry / prefs / plan / cart + SQLite durability + `MediaCard` types |
| `src/meals.ts` | Deterministic meal-plan stub + slot enrichment |
| `src/bedrock.ts` | Optional Bedrock Converse meal_plan path |
| `src/catalog.ts` | Deterministic mock catalog + `mediaCard` helpers |
| `scripts/mcp-smoke.ts` | Asserts protocol `2025-11-25` + non-empty `tools/list` |

### Tools

| Tool | Purpose |
|------|---------|
| `pantry_upsert` | Add/update pantry items |
| `pantry_query` | List/filter pantry |
| `prefs_set` / `prefs_get` | Dietary preferences |
| `meal_plan` | Bedrock (if configured) or deterministic multi-day plan; structured slots + `mediaCard` |
| `shop_list_build` | Shortfalls vs pantry |
| `product_search` | Mock catalog cards (asin, image, price, URL) + `mediaCard` |
| `cart_draft` / `cart_confirm` | Mock cart (no Amazon order); lines carry `mediaCard` |
| `session_recall` | Session/household context snapshot |
| `kitchen_run` | Agent loop: pantry → meal_plan → shop → product_search → cart_draft + step log |

### Structured meal + media cards

Meal slots include `description`, `tags`, `estimatedMinutes`, `ingredients`, and an Alexa-oriented `mediaCard` (`title`, `subtitle`, `text`, `imageUrl`, `detailPageUrl`). Product search and cart lines expose the same `mediaCard` shape so companion UIs can render consistently.

### Bedrock meal_plan (optional)

When **both** are set:

- `AWS_REGION`
- `BEDROCK_MODEL_ID`

…plus standard AWS credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN`, shared config, or IAM role), `meal_plan` calls Bedrock **Converse** and expects a JSON array of meal objects. On missing config or invoke/parse failure, the server falls back to the stub and reports `source: "stub"` (and `bedrockError` when applicable).

## Requirements

- **Node.js 20+**
- npm 9+

## Setup

```bash
cd pantrypilot-mcp
cp .env.example .env   # optional; add Bedrock vars only if you have access
npm install
npm run build
```

## Run

```bash
npm start
# → http://127.0.0.1:3000/mcp
# Health: http://127.0.0.1:3000/health
```

Environment (see `.env.example`):

- `PORT` (default `3000`)
- `HOST` (default `127.0.0.1`; use `0.0.0.0` in Docker)
- `ALLOWED_HOSTS` — comma-separated Host allow-list when not on plain localhost
- `AWS_REGION` + `BEDROCK_MODEL_ID` — enable Bedrock meal plans
- Standard AWS credential env vars (never commit real values)

### Docker

```bash
# Stub path (default — no AWS needed)
docker compose up --build

# Optional Bedrock (credentials from your shell / secret store)
export AWS_REGION=us-east-1
export BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
# export AWS_ACCESS_KEY_ID=...
# export AWS_SECRET_ACCESS_KEY=...
docker compose up --build
```

Compose forwards `AWS_*` / `BEDROCK_MODEL_ID` from the host environment; the image itself does not bake secrets.

## Smoke test

After `npm install`, the smoke script **starts an ephemeral server**, runs MCP `initialize` + `tools/list`, then exits:

```bash
npm run smoke
```

Expected output includes:

- `OK initialize protocolVersion=2025-11-25`
- `OK tools/list count=10` (or more)
- `SMOKE PASSED`

Against an already-running server you can also point a custom client at `http://127.0.0.1:3000/mcp` using `@modelcontextprotocol/sdk` `Client` + `StreamableHTTPClientTransport`.

## Companion UI + evals

```bash
npm start
# open http://127.0.0.1:3000/companion/
# Stock sample pantry → Run weekly kitchen → media cards

npm run eval
# PASS happy_path_pantry_meal_cart
# PASS failure_cart_confirm_without_draft
```

See [`FAILURE_MODES.md`](./FAILURE_MODES.md) for judge-oriented failure documentation.

## Demo script

**Preferred (GenAI / companion):** open `/companion/` → Stock sample pantry → **Run weekly kitchen** (`kitchen_run`).

**Tool-by-tool (Alexa+ / MCP client):**

1. **Warm start** — `session_recall` with `householdId: "demo"`.
2. **Stock the pantry** — `pantry_upsert` eggs, milk, rice.
3. **Prefs** — `prefs_set` `{ diet: ["omnivore"], servings: 2 }`.
4. **Agent loop** — `kitchen_run` `{ days: 3, goal: "weekly" }` → steps + meal/product `mediaCard`s + cart.
5. **Or manual:** `meal_plan` → `shop_list_build` → `product_search` → `cart_draft` → `cart_confirm`.
6. **Recall** — `session_recall` shows cart + pantry counts (SQLite-durable across restart).

## SDK notes

- Package: `@modelcontextprotocol/sdk` **v1.30.x** (monolith). Its `LATEST_PROTOCOL_VERSION` is `2025-11-25`.
- Transport: `StreamableHTTPServerTransport` with `enableJsonResponse: true` and session IDs.
- Optional LLM: `@aws-sdk/client-bedrock-runtime` (Converse).
- See `FRICTION_LOG.md` for scaffold friction vs the newer v2 / `2026-07-28` packages and Bedrock notes.

## License

MIT — see [LICENSE](./LICENSE).
