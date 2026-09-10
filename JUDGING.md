# PantryPilot — Judge Readiness Matrix

This document maps the working repository to the Amazon Developer Hackathon judging rubric and submission requirements. It is intended to make the project fast to verify during judging.

## Primary track: Alexa+

PantryPilot implements a self-hosted MCP server using Streamable HTTP and negotiates MCP protocol `2025-11-25`.

### Fast verification

```bash
npm install
npm run build
npm run smoke
npm run eval
npm run judge-check
```

For the visual workflow:

```bash
npm start
# open http://127.0.0.1:3000/companion/
```

The deterministic fallback means the full workflow can be judged without AWS credentials. A configured Bedrock run additionally demonstrates the AWS Builder integration.

## Rubric mapping

### 1. Tech Implementation

Evidence:

- `src/server.ts` — self-hosted MCP server over Streamable HTTP.
- `scripts/mcp-smoke.ts` — verifies MCP initialization, protocol negotiation and tool discovery.
- `src/tools.ts` — composable kitchen tools plus the `kitchen_run` agent entrypoint.
- `src/db.ts` / `src/state.ts` — durable household/session state.
- `src/bedrock.ts` — optional Amazon Bedrock Converse integration for structured meal generation.
- `evals/` — scripted happy-path and failure-path evaluation.
- `Dockerfile` + `docker-compose.yml` — reproducible runtime packaging.

Judge proof: run `npm run smoke`, then `npm run eval` and `npm run judge-check`.

### 2. Design

The experience is organized around one household outcome rather than exposing infrastructure to the user: pantry → preferences → meal plan → shortages → product discovery → cart draft. The companion UI renders the same structured `mediaCard` payloads returned by the MCP tools.

Safety boundary: PantryPilot never places a real order. `cart_draft` prepares state and `cart_confirm` requires an explicit confirmation step; the demo uses a mock catalog and mock cart.

Judge proof: open `/companion/`, stock the sample pantry and run the weekly kitchen flow.

### 3. Potential Impact

PantryPilot targets a recurring household problem: food inventory, meal planning and shopping are usually separate workflows. Persistent household state allows later sessions to continue from known pantry contents and preferences instead of restarting from a blank prompt. The architecture can replace the mock catalog/cart adapters with authorized commerce integrations without changing the MCP interaction model.

### 4. Quality of the Idea

The project treats Alexa+ as an agentic workflow surface rather than a single-turn recipe chatbot. `kitchen_run` coordinates multiple capabilities while retaining explicit user control at the cart boundary. The same state can be inspected through individual MCP tools, making the behavior testable and debuggable rather than opaque.

## AWS Builder mini challenge

`src/bedrock.ts` uses Amazon Bedrock Converse when `AWS_REGION` and `BEDROCK_MODEL_ID` are configured. Bedrock output is parsed into structured meal slots and participates in the larger stateful MCP workflow. If cloud configuration is absent or invocation/parsing fails, the deterministic planner keeps the demo functional and reports the source used.

Required final evidence before submission: capture one successful configured run where the meal-plan result reports `source: "bedrock"`.

## Open Source mini challenge

- Public repository: `burbanodev-lab/pantrypilot-mcp`
- License: MIT
- Contribution: new public MCP project created during the hackathon window.
- Included work: MCP server, persistent state, Bedrock integration, companion UI, evals, Docker packaging, smoke checks, product feedback and friction log.

## Submission requirement matrix

| Requirement | Repository evidence | Status |
|---|---|---|
| Working Alexa+ MCP server | `src/server.ts`, `src/tools.ts` | Ready |
| MCP 2025-11-25+ | `scripts/mcp-smoke.ts` | Ready |
| Streamable HTTP | `src/server.ts` | Ready |
| Public source + run instructions | `README.md` | Ready |
| Open-source license | `LICENSE` | Ready |
| Working demo path | `/companion/`, `scripts/demo-flow.ts` | Ready |
| Product feedback | `PRODUCT_FEEDBACK.md` | Ready |
| Friction log | `FRICTION_LOG.md` | Ready |
| AWS integration documentation | `src/bedrock.ts`, README | Ready |
| Bedrock-backed captured evidence | configured live run | Pending |
| Public English demo under 3 minutes | `SUBMISSION.md` storyboard | Pending |
| Devpost entry | final submission form | Pending |

## Three-minute judge path

1. **0:00–0:20** — show the problem and one-line architecture.
2. **0:20–0:40** — run `npm run smoke`; show MCP `2025-11-25` and tool discovery.
3. **0:40–1:40** — open companion, stock pantry, run `kitchen_run`; show meals and persisted state.
4. **1:40–2:15** — show shortage/product/cart draft flow and explicit confirmation boundary.
5. **2:15–2:40** — show Bedrock-backed result with `source: "bedrock"` and `src/bedrock.ts`.
6. **2:40–2:55** — show eval/judge-check passing plus friction/product feedback.
7. **2:55–3:00** — close: PantryPilot turns Alexa+ from pantry Q&A into a stateful, testable household workflow.

## Remaining blockers

No code blocker is known. The remaining submission-critical work is external evidence: run Bedrock with authorized AWS configuration, record/publish the public English demo, and complete the Devpost entry before the deadline.
