# PantryPilot — GenAI Open Agent Hackathon 2026 (draft)

**Entrant:** Samuel Burbano (`burbanodev-lab`) · `burbano.dev@gmail.com`  
**Event:** [Open Agent Hackathon 2026](https://hackathon.genai.works/event/open-agent-hackathon-2026)  
**Primary track:** **05 — Real-World Industry Agents** (household grocery / kitchen ops)  
**Backup track:** **04 — Persistent Memory Agents**  
**Reg closes:** 2026-10-13 00:00 UTC · **Build:** 2026-10-15 → 2026-10-20 UTC · **Prizes:** US$8k / $4k / $2k

## One-liner

PantryPilot is a production-oriented MCP kitchen agent: durable household memory, pantry + prefs, multi-step `kitchen_run`, shopping gaps, and a reversible mock cart — so families waste less food and stay on budget.

## Why Track 05

Concrete operational problem (weekly kitchen ops), industry-shaped workflow (pantry → plan → shop → cart), and a demo path a household could actually run. Not a recipe chatbot.

## Agent surfaces

| Surface | Evidence |
|---------|----------|
| Tools (11) | `kitchen_run` + pantry/prefs/meal/shop/product/cart/session |
| Durable memory | SQLite (`sql.js`) via `DATABASE_PATH` |
| Resources | `pantry://agent/overview`, `pantry://household/{id}` |
| Prompts | `use_up_expiring`, `weekly_kitchen` |
| Companion | `/companion/` on the same Express host |
| Evals | `npm run eval` (happy path + failure + shop units + host allow-list + resources/prompts) |
| Failure honesty | `FAILURE_MODES.md` |

## Pre-existing vs scored window

See [`PREEXISTING.md`](./PREEXISTING.md) and tag `baseline/pre-genai-2026-10-14`.

**Declare as pre-existing if merged before 2026-10-15 UTC:** SQLite, `kitchen_run`, companion, evals, adversarial host/unit fixes, MCP resources/prompts.

**Keep for Oct 15–20 scored delta (planned):** ≥2 live external data sources (Open Food Facts + CSV/receipt ingest), hard allergen/budget gates + Impact metrics, hardened public HTTPS judge path.

## Judge demo (local, no secrets)

```bash
npm ci && npm run build
npm run verify-submission   # or: npm run eval && npm run smoke && npm run judge-check
npm start                   # companion at http://127.0.0.1:3000/companion/
```

1. Stock sample pantry → Run weekly kitchen (`kitchen_run`).
2. Show step log, shopping gaps, draft cart, media cards.
3. Optional: `use_up_expiring` prompt path / resource read `pantry://household/demo`.
4. Narrate mock-cart boundary (no real purchase).

## Live MCP note

- Listing: https://mcpize.com/mcp/pantrypilot  
- Gateway health: https://pantrypilot.mcpize.run/health → **200** public  
- Gateway `/mcp` (and unauthenticated companion probes through the gateway) → **401 Bearer required** — expected MCPize OAuth, not an app regression. Prefer local Docker/companion for judges without tokens.

## Human-only blockers (do not automate)

- Stripe Connect KYC for MCPize payouts
- Devpost unsuspend / Amazon track submit (separate contest)
- Any login / payment / identity verification

## Status vocabulary

Use engine statuses only when earned: FOUND → VERIFIED → WORKING → SUBMITTED → REVIEW → REWARDED → PAID.  
GenAI registration is already done; this packet is **WORKING** prep until the Oct 15–20 build/submit window.
