# Failure modes — PantryPilot MCP

Judge-facing failure documentation for the **Amazon Developer Hackathon (Alexa+)** submission (shared language for any reviewer exercising the same MCP surface). Goal: document real failures so expectations stay honest. **No secrets.** Mock cart never places Amazon orders.

## Summary table

| # | Failure | Symptom | Severity | Mitigation / status |
|---|---------|---------|----------|---------------------|
| 1 | Bedrock unavailable / misconfigured | `meal_plan` / `kitchen_run` report `mealPlanSource: "stub"` (+ optional `bedrockError`) | Med | Deterministic stub always available; AWS optional |
| 2 | Confirm cart with no draft | `{ ok: false, error: "No cart draft found…" }` | Low | Soft-fail JSON; companion/evals assert this path |
| 3 | Cart id mismatch on confirm | `{ ok: false, error: "Cart id mismatch…" }` | Low | Client must pass current `cartId` or omit |
| 4 | Process restart w/o durable DB | Empty pantry / lost session bind | High | SQLite via `DATABASE_PATH` + Docker volume `pantrypilot-data` |
| 5 | Host header rejected | HTTP 403 from Express host allow-list | Med | Set `ALLOWED_HOSTS` for deploy hostname |
| 6 | Stale / missing MCP session | `400 Bad Request: No valid session ID` | Med | Client must `initialize` then send `mcp-session-id` |
| 7 | Catalog miss on ingredient | Shop line skipped in cart draft | Med | Mock catalog coverage; label demo as mock shopping |
| 8 | Hosted `/mcp` Bearer-auth friction | Judges get **401** on HTTPS `/mcp` with `Bearer token required` | High | **Expected** MCPize gateway OAuth — `/health` stays 200 public; demo via local `npm start` / `docker compose` `/companion/` or authorized Bearer. **Do not advertise gated `/mcp` as the main live demo.** |
| 9 | Over-budget / allergy hard-gated | `{ code: "BUDGET_EXCEEDED" }` / `{ code: "ALLERGEN_BLOCKED" }` soft-fail JSON | Med | `src/gates.ts` enforces on meal_plan / product_search / cart_draft / kitchen_run |
| 10 | Companion CORS / wrong MCP URL | Browser fetch fails when UI ≠ MCP origin | Low | Serve companion from same Express app at `/companion/` |

## Judge access guidance (current)

1. **Preferred:** clone → `npm ci` → `npm run verify-submission` → `npm start` → open `http://127.0.0.1:3000/companion/`.
2. **Docker:** `docker compose up --build` → same companion URL on port 3000.
3. **Hosted:** `https://pantrypilot.mcpize.run/health` is public. `https://pantrypilot.mcpize.run/mcp` requires Bearer — treat 401 as expected gateway auth, not a product defect.
4. Prefer the published demo video + local companion over sending judges to a credential-gated MCP endpoint.

## Detail

### 1. Bedrock path fails closed to stub

When `AWS_REGION` + `BEDROCK_MODEL_ID` (+ credentials) are missing or Converse errors, meal planning **does not abort** the agent loop. `kitchen_run` continues with stub slots and surfaces `bedrockError` when applicable. Demo video should not depend on live Bedrock. Docs must not claim a live `source: bedrock` capture unless one was actually recorded with authorized AWS access.

### 2–3. Cart confirm soft failures

`cart_confirm` never throws for “no cart” / wrong id — it returns structured `{ ok: false }`. Eval `failure_cart_confirm_without_draft` locks this contract.

### 4. Persistence

Pre-SQLite in-memory maps died on every mcpize/Docker restart. Current default: `sql.js` file at `DATABASE_PATH` (compose: `/data/pantrypilot.sqlite`). Prove with: upsert → kill process → `session_recall`.

### 5–6. Transport / deploy footguns

Streamable HTTP is sessionful. Companion resets session on each “Run” for a clean demo story. Deploy must include the public hostname in `ALLOWED_HOSTS`.

### 7. Mock catalog gaps

`matchProductForIngredient` may miss exotic stub ingredients → fewer cart lines than shop lines. Acceptable for hackathon mock; call out in demo narration.

### 8. Hosted MCP auth

Prefer showing companion + `/health` locally via compose if the hosted MCP URL is gated. Never paste API keys into the video or repo.

### 9. Preference hard gates (allergen + budget)

`prefs.allergies` and `prefs.budgetCents` are enforced in `src/gates.ts`:
- **Allergen:** meal slots and catalog products matching allergy aliases are filtered; all-blocked returns `code: "ALLERGEN_BLOCKED"`.
- **Budget:** `cart_draft` / `kitchen_run` reject drafts when `totalCents > budgetCents` with `code: "BUDGET_EXCEEDED"` (cart not stored).
Evals: `allergen_gate_blocks_milk`, `budget_gate_rejects_over_ceiling`, `gates_happy_path_allergen_ok_budget_ok`.

### 10. Companion client

Static UI under `apps/companion` uses fetch JSON-RPC. Open `http://127.0.0.1:3000/companion/` against the same process to avoid CORS.

## How to reproduce key cases

```bash
npm run eval          # happy path + cart_confirm failure + gates
npm run smoke         # protocol + kitchen_run smoke
npm start             # then open /companion/
```

## Changelog

- 2026-09-11 (America/Bogota): reframed for Amazon Alexa+ judges; clarified hosted Bearer 401 guidance.
- 2026-09-10 (America/Bogota): initial draft (companion + evals).
