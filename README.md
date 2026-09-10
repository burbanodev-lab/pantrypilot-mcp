# PantryPilot MCP

Greenfield **TypeScript** [Model Context Protocol](https://modelcontextprotocol.io) server for the **Amazon Developer Hackathon — Alexa+ track**.

PantryPilot exposes household pantry, preferences, meal planning, shopping list, product search (mock catalog with card fields), and cart draft/confirm tools over **Streamable HTTP**. Protocol version negotiated on `initialize`: **`2025-11-25`**.

No AWS keys are required for this MVP.

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
                ▼
     In-memory household store
     (keyed by householdId;
      MCP sessionId → household bind)
                │
                ▼
     Mock product catalog (ASIN cards)
```

| Layer | Role |
|-------|------|
| `src/server.ts` | Entry: Streamable HTTP, session map, `/mcp` + `/health` |
| `src/tools.ts` | Ten MCP tools |
| `src/state.ts` | Household pantry / prefs / plan / cart |
| `src/catalog.ts` | Deterministic mock catalog + search |
| `scripts/mcp-smoke.ts` | Asserts protocol `2025-11-25` + non-empty `tools/list` |

### Tools

| Tool | Purpose |
|------|---------|
| `pantry_upsert` | Add/update pantry items |
| `pantry_query` | List/filter pantry |
| `prefs_set` / `prefs_get` | Dietary preferences |
| `meal_plan` | Deterministic multi-day plan stub |
| `shop_list_build` | Shortfalls vs pantry |
| `product_search` | Mock catalog cards (asin, image, price, URL) |
| `cart_draft` / `cart_confirm` | Mock cart (no Amazon order) |
| `session_recall` | Session/household context snapshot |

## Requirements

- **Node.js 20+**
- npm 9+

## Setup

```bash
cd pantrypilot-mcp
cp .env.example .env   # optional
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

### Docker

```bash
docker compose up --build
```

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

## Demo outline (Alexa+)

1. **Warm start** — `session_recall` with `householdId: "demo"`.
2. **Stock the pantry** — `pantry_upsert` eggs, milk, rice.
3. **Prefs** — `prefs_set` `{ diet: ["omnivore"], servings: 2 }`.
4. **Plan** — `meal_plan` `{ days: 3 }` → deterministic breakfast/lunch/dinner.
5. **Shop** — `shop_list_build` → gaps not covered by pantry.
6. **Discover** — `product_search` `{ query: "chicken" }` → Alexa-ready cards.
7. **Cart** — `cart_draft` then `cart_confirm` → mock receipt (no AWS).
8. **Recall** — `session_recall` shows cart confirmed + pantry counts.

## SDK notes

- Package: `@modelcontextprotocol/sdk` **v1.30.x** (monolith). Its `LATEST_PROTOCOL_VERSION` is `2025-11-25`.
- Transport: `StreamableHTTPServerTransport` with `enableJsonResponse: true` and session IDs.
- See `FRICTION_LOG.md` for scaffold friction vs the newer v2 / `2026-07-28` packages.

## License

MIT — see [LICENSE](./LICENSE).
