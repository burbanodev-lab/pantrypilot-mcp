# PantryPilot — Judges (60-second packet)

**What it is:** A self-hosted **MCP 2025-11-25** kitchen operations agent for the Amazon Developer Hackathon **Alexa+** track. Durable pantry/prefs/plan/cart state → `kitchen_run` orchestrates meal plan → shortages → mock products → reversible cart draft, with structured media cards and session recall.

**Why Alexa+:** Streamable HTTP tool surface, multi-step agentic workflow over remembered household state, companion UI suitable for media/cards — not a single-turn chatbot wrapper.

| Link | URL |
|------|-----|
| Devpost (SUBMITTED) | https://devpost.com/software/pantrypilot-sytrm1 |
| Demo video | https://www.youtube.com/watch?v=U24ZL9LqIsw |
| Repository | https://github.com/burbanodev-lab/pantrypilot-mcp |

## Criteria mapping

| Criterion | How PantryPilot addresses it |
|-----------|------------------------------|
| **Tech Implementation** | MCP `2025-11-25` Streamable HTTP; SQLite durability; raw-wire conformance + smoke; optional Bedrock Converse (`@aws-sdk/client-bedrock-runtime`) with stub fallback |
| **Design** | Companion UI at `/companion/`; shared `mediaCard` on meals/products/cart; one coherent kitchen workflow via `kitchen_run` |
| **Potential Impact** | Recurring household meal/shopping coordination — fewer fragmented steps from pantry → plan → cart draft |
| **Quality of Idea** | Persistent state + safe multi-tool orchestration instead of a one-shot chatbot; explicit draft/confirm boundary |

## Quick start

```bash
git clone https://github.com/burbanodev-lab/pantrypilot-mcp.git
cd pantrypilot-mcp
npm ci
npm run verify-submission
npm start
```

Open `http://127.0.0.1:3000/companion/` → **Stock sample pantry** → **Run weekly kitchen**.

No AWS credentials required for the primary path.

## Safety

- Product search + cart are **mock**; confirm does **not** place an Amazon order or transfer funds.
- Allergen + budget hard gates soft-fail with structured error codes (`ALLERGEN_BLOCKED`, `BUDGET_EXCEEDED`).

## Known limitations (brief)

- Mock catalog only — no real purchase integration.
- Live Bedrock requires authorized AWS config; otherwise `source: "stub"` (honest, reproducible).
- Hosted `https://pantrypilot.mcpize.run/mcp` returns **401 Bearer required** (gateway) — use local companion + video for judging.
- `sql.js` is single-process demo persistence, not multi-replica production.

More detail: [`SUBMISSION.md`](./SUBMISSION.md) · [`FAILURE_MODES.md`](./FAILURE_MODES.md) · [`FRICTION_LOG.md`](./FRICTION_LOG.md) · [`JUDGE_CARD.md`](./JUDGE_CARD.md)
