# PantryPilot — 3-minute judge demo runbook

This is the recording-ready runbook for the Amazon Alexa+ submission. It is deliberately executable without AWS credentials; a live Bedrock proof can be inserted only when authorized credentials are available.

## Preflight (do before recording)

```bash
npm ci
npm run build
npm run mcp-conformance
npm run judge-check
npm run eval
```

Do not start recording unless all commands pass.

## Recording layout

Keep two windows visible and prepared before capture:

1. Terminal at the repository root.
2. Browser at `http://127.0.0.1:3000/companion/` after `npm start`.

Use 1080p capture. Do not expose environment variables, AWS account identifiers, credentials, browser bookmarks, notifications, or unrelated tabs.

## Shot list — target 2:45–2:55

### 0:00–0:15 — Promise

Show the companion UI.

Narration:

> PantryPilot turns pantry state, dietary preferences, meal planning, shopping gaps and a safe cart draft into one persistent Alexa+-ready agent workflow.

### 0:15–0:35 — Protocol proof

In terminal:

```bash
npm run mcp-conformance
```

Keep the successful protocol negotiation and tool discovery visible.

Narration:

> The backend is a self-hosted Model Context Protocol server using Streamable HTTP. This raw-wire test verifies the required MCP 2025-11-25 negotiation without relying on the MCP client SDK.

### 0:35–0:58 — Household memory

In the companion UI choose **Stock sample pantry** and set the demo preferences.

Narration:

> PantryPilot stores household inventory and preferences as durable state, so the agent can reason from what the household already has instead of starting every request from zero.

### 0:58–1:43 — Agentic kitchen run

Click **Run weekly kitchen**. Scroll only enough to expose the ordered workflow, meals, missing ingredients, product matches and cart draft.

Narration:

> One kitchen run coordinates multiple tools: it reads pantry state and preferences, creates a meal plan, computes shortages, discovers matching products and prepares a cart draft. The result is an orchestrated workflow, not a single API response.

### 1:43–2:03 — Persistence and safety

Show the recalled state/cart. If useful, run:

```bash
npm run demo
```

Narration:

> The state can be recalled in a later session. Shopping remains deliberately reversible: PantryPilot drafts a cart but never places an external order or transfers money.

### 2:03–2:25 — AWS / Bedrock

Show the Bedrock integration in the repository or an already-prepared authorized run whose output reports `source: bedrock`.

Narration without live credentials:

> Meal planning also integrates Amazon Bedrock through the Converse API. Bedrock is an optional live runtime path; the deterministic fallback keeps judging reproducible without requiring cloud credentials.

If an authorized Bedrock run has been captured, replace the second sentence with:

> This run is backed by Amazon Bedrock through the Converse API, while the deterministic fallback keeps judging reproducible without cloud credentials.

### 2:25–2:43 — Engineering evidence

Show the repository root and CI/evaluation files.

Narration:

> The public MIT-licensed repository includes Node 20 and 22 CI, Docker packaging, raw MCP conformance, smoke tests, offline evaluations, failure-mode documentation and judge instructions.

### 2:43–2:52 — Close

Return to the companion UI.

Narration:

> PantryPilot makes Alexa+ a stateful kitchen operator: it plans, remembers, coordinates tools and prepares shopping safely.

## Recording acceptance checklist

- Total video duration is below 3:00.
- English narration is intelligible.
- MCP `2025-11-25` appears visibly in the protocol proof.
- `kitchen_run` visibly produces multiple coordinated outputs.
- Persistent/recalled state is demonstrated.
- Cart is described as a draft; no real purchase is implied.
- Bedrock is not claimed as a live execution unless an authorized live run is actually shown.
- No secrets, credentials or private account data appear.
- Repository URL is visible at least once.

## Upload metadata

**Suggested title:** PantryPilot — Stateful Alexa+ Kitchen Agent over MCP

**Suggested description:**

PantryPilot is a self-hosted MCP 2025-11-25 Streamable HTTP server that gives an Alexa+-ready kitchen agent durable pantry memory, dietary preferences, multi-step meal planning, shortage calculation, product discovery and safe cart drafting. Built with TypeScript, Node.js, SQLite-compatible persistence, the Model Context Protocol SDK and optional Amazon Bedrock Converse integration. Source: https://github.com/burbanodev-lab/pantrypilot-mcp

After upload, place the public YouTube/Vimeo URL in the Devpost submission and re-run `npm run submission-audit` before final submission.
