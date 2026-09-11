# PantryPilot — record-ready demo script

Target runtime: **2:45–2:55**. Hard stop before 3:00. Record in English, with no copyrighted music or third-party footage.

## 0:00–0:15 — Problem and promise

**Screen:** PantryPilot companion UI.

**Say:**
> Pantry decisions are fragmented across inventory, meal planning, shopping, and memory. PantryPilot turns those steps into one persistent Alexa+-ready kitchen workflow, exposed as a self-hosted MCP server.

## 0:15–0:35 — Alexa+ protocol proof

**Screen:** terminal.

```bash
npm run mcp-conformance
```

**Say:**
> This is not a README-only MCP claim. The raw HTTP conformance probe negotiates MCP 2025-11-25 over Streamable HTTP, creates a session, initializes it, discovers tools, rejects an invalid session, and closes the session.

Pause briefly on the successful protocol/version and tool-discovery output.

## 0:35–1:00 — Persistent household state

**Screen:** companion UI at `http://127.0.0.1:3000/companion/`.

1. Click **Stock sample pantry**.
2. Set/show household preferences and two servings.
3. Show the populated pantry.

**Say:**
> PantryPilot stores household inventory and dietary preferences in durable SQLite-backed state, so later agent runs operate on remembered context instead of starting from zero.

## 1:00–1:50 — Agentic kitchen workflow

**Screen:** click **Run weekly kitchen** and show the result cards.

**Say:**
> One kitchen run coordinates multiple domain tools. It reads pantry state and preferences, creates a meal plan, computes ingredient shortages, discovers matching product options, and prepares a reversible cart draft. The workflow returns structured meal, product, media-card, and cart data rather than a single chat response.

Show the meal plan, missing ingredients/product matches, and draft cart. Do not imply that PantryPilot places a real order.

## 1:50–2:10 — Memory and safety

**Screen:** terminal.

```bash
npm run demo
```

Pause on `JUDGE EVIDENCE SUMMARY`.

**Say:**
> The automated demo independently proves the workflow source and recalls the persisted household state. Purchasing is intentionally bounded: PantryPilot can prepare a cart draft, but it never transfers funds or places an external order.

## 2:10–2:32 — AWS Builder evidence

**Screen:** `src/bedrock.ts` plus terminal or existing authorized Bedrock evidence.

**Say:**
> PantryPilot also integrates Amazon Bedrock Runtime through the Converse API for meal-plan generation. The integration validates and normalizes model output before it can update application state. Without AWS configuration, the same workflow remains reproducible through a deterministic fallback.

**Only if an authorized live Bedrock run has actually been captured**, additionally show `mealPlanSource: bedrock` and say:
> This run is using the live Bedrock path.

Do not claim a live Bedrock execution if one has not been performed.

## 2:32–2:48 — Engineering quality

**Screen:** repository root / GitHub Actions / test commands.

**Say:**
> The public MIT-licensed repository includes Node 20 and 22 CI, raw-wire MCP conformance, offline evaluations, submission audits, Docker packaging, testing instructions, and a friction log documenting the developer experience.

## 2:48–2:55 — Close

**Screen:** companion UI result.

**Say:**
> PantryPilot makes Alexa+ a stateful kitchen operator: it plans, remembers, coordinates tools, and prepares shopping safely.

## Recording checklist

- Keep the exported video below **3:00**; target 2:55 maximum.
- Show the project actually functioning, not slides alone.
- Keep terminal text large enough to read at 1080p.
- Do not use copyrighted music, third-party footage, or unrelated trademarks.
- Upload the final video publicly to YouTube or Vimeo.
- Paste the public video URL into the Devpost submission.
- If no authorized Bedrock run exists, use the truthful fallback wording above; never present fallback output as a live AWS call.
