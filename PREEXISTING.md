# Pre-existing components — GenAI Open Agent Hackathon 2026

**Repo:** https://github.com/burbanodev-lab/pantrypilot-mcp  
**Live MCP:** https://pantrypilot.mcpize.run  
**MCPize listing / marketplace:** configured via `mcpize.yaml` (name: `pantrypilot`)  
**Baseline tag:** `baseline/pre-genai-2026-10-14`  
**Baseline SHA:** `49f96739ff39d2f2fdde4990857b14bc158797e6` (tag target on `main` at freeze)

PantryPilot existed **before** the GenAI Open Agent 2026 build window (2026-10-15T00:00:00Z). This file inventories what judges should treat as **pre-existing product code** vs work intended for the scored window.

## Declared pre-existing (at baseline tag)

| Area | What |
|------|------|
| Protocol | Express Streamable HTTP MCP server (`src/server.ts`), protocol **`2025-11-25`** via `@modelcontextprotocol/sdk@1.30.0` |
| Tools (10) | `pantry_upsert`, `pantry_query`, `prefs_set`, `prefs_get`, `meal_plan`, `shop_list_build`, `product_search`, `cart_draft`, `cart_confirm`, `session_recall` in `src/tools.ts` |
| State | In-memory household map (`src/state.ts`) keyed by `householdId` + session bind |
| Domain | Mock catalog (`src/catalog.ts`), deterministic meal stub (`src/meals.ts`), optional Bedrock Converse (`src/bedrock.ts`) |
| Ops | `Dockerfile`, `docker-compose.yml`, `scripts/mcp-smoke.ts`, MIT `LICENSE`, `mcpize.yaml`, README / FRICTION_LOG / SUBMISSION (Amazon Alexa+) |

## Added on branch `genai/open-agent-2026` (prep / scored delta)

These land after the baseline tag. If merged **before** 2026-10-15 UTC, also declare them as pre-existing on the GenAI submission form. If kept for in-window iteration, they are the primary Technical scored delta.

| Item | Purpose |
|------|---------|
| SQLite durability (`src/db.ts` + `state.ts` adapters) | Survive restart; `DATABASE_PATH` default `./data/pantrypilot.sqlite` |
| Tool `kitchen_run` | One-call agent loop: pantry → meal_plan → shop_list → product_search → cart_draft + step log |
| Docs / deploy tweaks | PREEXISTING.md, FRICTION_LOG entries, compose volume for SQLite |

## Prep landed after baseline (declare if merged pre-window)

| Item | Purpose |
|------|---------|
| Web companion (`apps/companion` + `/companion/`) | Demo + Product/UX: `kitchen_run` + media cards |
| `evals/` + `npm run eval` | Happy-path pantry→meal→cart + soft-fail `cart_confirm` |
| `FAILURE_MODES.md` | Judge-oriented failure documentation (bonus) |

## Still planned during Oct 15–20 window

1. ≥2 real external data sources (e.g. Open Food Facts + receipt/CSV ingest)
2. MCP resources + prompts (`pantry://…`, `use_up_expiring`)
3. Hard allergen / budget gates + Impact metrics polish
4. Hardened public HTTPS judge path / demo fixtures

## Positioning

> **PantryPilot** is a production-oriented MCP kitchen agent: durable household memory, pantry + prefs + food data, closes the loop to a shopping cart — so families waste less food and stay on budget. Not a recipe chatbot.

**Primary track intent:** Track 05 — Real-World Industry Agents (household grocery / kitchen ops). Backup: Track 04 — Persistent Memory Agents.

## How to diff scored work

```bash
git fetch --tags
git log --oneline baseline/pre-genai-2026-10-14..genai/open-agent-2026
git diff baseline/pre-genai-2026-10-14...genai/open-agent-2026
```
