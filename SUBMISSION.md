# PantryPilot — Amazon Developer Hackathon Submission

## Submission title
**PantryPilot — a stateful Alexa+ kitchen operations agent over MCP**

## Tagline
Turn pantry state, dietary preferences, meal planning, shopping gaps, product discovery, and a safe cart draft into one persistent agentic workflow.

## Primary track

**Alexa+**

PantryPilot is a self-hosted Model Context Protocol server implementing **MCP 2025-11-25 over Streamable HTTP**. It is designed as an Alexa+-ready household agent backend rather than a single-turn chatbot or thin API wrapper.

A household can use one stateful workflow to remember pantry inventory, store dietary preferences, generate meal plans, calculate shopping gaps, discover products, draft a cart, and recall the resulting context across sessions.

## Mini challenges

### AWS Builder

PantryPilot integrates **Amazon Bedrock Runtime** through `@aws-sdk/client-bedrock-runtime` and the Bedrock **Converse** API for meal-plan generation. The live runtime path is enabled only when `AWS_REGION` and `BEDROCK_MODEL_ID` are configured; otherwise the project remains fully testable through a deterministic fallback.

This is not a single-turn Bedrock wrapper. Bedrock output participates in a stateful MCP workflow spanning pantry inventory, preferences, planning, shortage calculation, product discovery, cart drafting, and later session recall.

### Open Source

- Contribution URL: https://github.com/burbanodev-lab/pantrypilot-mcp
- Project repository: https://github.com/burbanodev-lab/pantrypilot-mcp
- GitHub username: `burbanodev-lab`
- License: MIT

The contribution includes the MCP server, companion experience, raw-wire conformance tests, evaluation harness, persistence layer, Bedrock integration, Docker setup, failure-mode documentation, friction log, and judge-ready submission metadata.

## What PantryPilot does

1. Add or update pantry inventory.
2. Store household dietary preferences and serving size.
3. Generate a multi-day meal plan.
4. Compare meal requirements with pantry inventory.
5. Build a shopping list for missing ingredients.
6. Discover matching product options with structured media cards.
7. Draft a cart without placing a real order.
8. Recall household/session state later.

The `kitchen_run` tool orchestrates the end-to-end workflow and returns an ordered step log plus structured meal, product, and cart payloads.

## Why this is agentic

PantryPilot does more than answer a question. It coordinates multiple tools against durable household state and carries context across sessions. A single run can read pantry inventory, use preferences to create a plan, infer missing items, search products, and prepare a reversible cart draft.

Purchasing remains intentionally non-destructive: PantryPilot never transfers funds or places an external order.

## Runtime technology evidence

The Alexa+ requirement is exercised at runtime, not merely named in documentation:

- `src/server.ts` exposes the MCP endpoint over Streamable HTTP.
- `scripts/mcp-conformance.ts` validates the wire protocol directly over HTTP without using the MCP client SDK.
- The conformance probe verifies protocol negotiation at `2025-11-25`, session creation, `notifications/initialized`, tool discovery, invalid-session rejection, and session deletion.
- `scripts/mcp-smoke.ts` exercises initialize + `tools/list` through the MCP client SDK.

## Architecture

- TypeScript + Node.js 20+
- `@modelcontextprotocol/sdk`
- `StreamableHTTPServerTransport`
- Express HTTP server with MCP session IDs
- `sql.js` SQLite persistence for household/session state
- Amazon Bedrock Runtime Converse API as an optional live LLM path
- Deterministic credential-free fallback
- Companion web experience served by the same application
- Docker / Docker Compose
- CI on Node 20 and Node 22
- Offline smoke, raw-wire MCP conformance, judge-readiness, and evaluation scripts

## Significant updates during the hackathon window

PantryPilot was created for the hackathon and has been materially expanded during the submission period with:

- MCP `2025-11-25` Streamable HTTP transport and stateful sessions.
- Durable SQLite-backed household memory.
- `kitchen_run` orchestration across pantry, meal, shopping, product, and cart tools.
- Structured media cards for meals, products, and cart lines.
- Optional Amazon Bedrock Converse integration.
- Companion browser UI for a simulated Alexa+-style experience.
- Raw-wire MCP conformance testing independent of the SDK client.
- Node 20/22 CI coverage.
- Dockerized reproducible execution.
- Judge-readiness, failure-mode, product-feedback, and friction documentation.

## Judge testing instructions

No AWS credentials are required for the main judging path.

```bash
git clone https://github.com/burbanodev-lab/pantrypilot-mcp.git
cd pantrypilot-mcp
npm install
npm run build
npm run mcp-conformance
npm run smoke
npm run eval
npm run judge-check
```

To try the companion experience:

```bash
npm start
```

Open `http://127.0.0.1:3000/companion/`, choose **Stock sample pantry**, then **Run weekly kitchen**.

Optional Bedrock path:

```bash
export AWS_REGION=us-east-1
export BEDROCK_MODEL_ID=<supported-model-id>
npm start
```

AWS credentials are resolved through the standard AWS SDK credential provider chain and are never committed to the repository.

## Expected judge validation signals

- MCP initialize negotiates `protocolVersion=2025-11-25`.
- `tools/list` returns the PantryPilot tool surface.
- `kitchen_run` returns an ordered step log and household outputs.
- `session_recall` shows remembered pantry/cart context.
- `npm run eval` covers a happy path and safe failure behavior.

## Product feedback

### Tools / APIs / SDKs used

- Model Context Protocol TypeScript SDK for the Alexa+ MCP runtime.
- Amazon Bedrock Runtime SDK (`@aws-sdk/client-bedrock-runtime`) and Converse API for optional generative meal planning.
- AWS SDK standard credential provider chain for configuration without embedded secrets.

### What worked well

**MCP SDK:** `McpServer` plus `StreamableHTTPServerTransport` made it possible to expose a standards-based agent tool surface with explicit session handling. Once the matching SDK generation was selected, JSON-response Streamable HTTP was straightforward to test locally.

**Amazon Bedrock Runtime SDK:** Converse provides a compact cross-model interface and fits cleanly behind a deterministic fallback, so the same application can be judged locally and optionally demonstrated with a live AWS model.

**AWS credential model:** using the standard SDK provider chain avoids hard-coded credentials and keeps local, Docker, and hosted deployment patterns consistent.

### What needs work

**MCP SDK version discoverability:** current TypeScript MCP documentation and package evolution can lead developers toward newer package layouts/protocol revisions while a downstream integration may require an earlier protocol revision. A compatibility table mapping package/version to MCP protocol revision would reduce setup risk.

**Structured generation with Bedrock:** free-form model text still requires parsing and normalization before it can safely mutate application state. More prominent cross-model structured-output examples for Converse would make production agent workflows easier to harden.

### Onboarding experience

The domain application was quick to scaffold, but selecting the correct MCP SDK generation for the required `2025-11-25` protocol version required extra verification. The working combination was the maintained `@modelcontextprotocol/sdk` v1 line with `McpServer` and `StreamableHTTPServerTransport`. Bedrock integration was simpler because Converse and the AWS SDK credential chain fit naturally into the existing TypeScript service.

### Would I build with these services again?

**Yes.** MCP gives PantryPilot a portable agent-tool contract rather than binding domain logic to one chat UI, while Bedrock provides an optional managed model runtime without making the core workflow dependent on cloud credentials for local testing.

## Friction log

Detailed entries are maintained in [`FRICTION_LOG.md`](./FRICTION_LOG.md), including:

- matching the Alexa+ required MCP revision to the appropriate TypeScript SDK generation;
- keeping Bedrock optional so CI and local judging remain credential-free;
- choosing a SQLite implementation that works without a native compiler toolchain.

## Three-minute demo storyboard

**0:00–0:18 — Problem + promise**  
Show PantryPilot companion UI and explain: pantry inventory, meal decisions, and shopping gaps are fragmented. PantryPilot turns them into one persistent Alexa+-ready agent workflow.

**0:18–0:38 — Protocol proof**  
Run `npm run mcp-conformance`. Highlight successful MCP `2025-11-25` negotiation and tool discovery over Streamable HTTP.

**0:38–1:05 — Persistent household state**  
Open the companion UI. Stock the sample pantry and set preferences. Show remembered household state.

**1:05–1:55 — Agentic workflow**  
Run **Run weekly kitchen**. Show `kitchen_run` producing meal slots, missing ingredients, product matches, media cards, and a cart draft in one orchestrated flow.

**1:55–2:18 — Persistence + safety**  
Show `session_recall`, then explain the explicit draft/confirm boundary. No real external order or payment is executed.

**2:18–2:42 — AWS Builder evidence**  
Show the Bedrock integration and, when authorized AWS access is available, a run reporting `source: bedrock`. Otherwise show the deterministic path and explain the optional runtime gate.

**2:42–2:55 — Engineering quality**  
Show CI, Docker, evals, failure modes, and the friction log.

**2:55–3:00 — Close**  
"PantryPilot makes Alexa+ a stateful kitchen operator: it plans, remembers, coordinates tools, and prepares shopping safely."

## Submission description

**PantryPilot** is a stateful Alexa+ kitchen operations agent delivered as a self-hosted MCP server. A household can stock its pantry, save dietary preferences, generate multi-day meal plans, calculate ingredient shortages, discover mock products, draft a cart, and recall the resulting state later. The project uses Streamable HTTP and negotiates MCP `2025-11-25`. Its optional Amazon Bedrock Converse integration generates structured meal plans while a deterministic fallback keeps the entire demo reproducible without cloud credentials. Rather than wrapping one API, PantryPilot exposes composable tools and carries household/session context through an end-to-end agentic workflow. Structured media cards make meal and product results suitable for a companion Alexa+ experience. No real order or financial transaction is performed.

## Known limitations

- Product search and cart operations use a deterministic mock catalog; PantryPilot intentionally does not place real purchases.
- A live Bedrock call requires the developer/judge to provide authorized AWS configuration.
- `sql.js` persistence targets a single-process demo deployment rather than multi-replica production scale.

## Final submission gates

- [x] Public source repository
- [x] MIT license
- [x] Alexa+ runtime requirement: MCP `2025-11-25` over Streamable HTTP
- [x] Working self-hosted MCP implementation
- [x] AWS Bedrock integration documented in source
- [x] README setup/run instructions
- [x] Docker packaging
- [x] MCP SDK smoke test
- [x] Raw-wire MCP conformance test
- [x] Product feedback drafted
- [x] Friction log drafted
- [x] Alexa+ submission copy drafted
- [x] AWS Builder mini-challenge copy drafted
- [x] Open Source mini-challenge metadata drafted
- [x] Judge testing instructions drafted
- [x] <=3 minute demo storyboard drafted
- [ ] Capture an authorized live Bedrock-backed run (`source: bedrock`) if available
- [ ] Record and publish public YouTube/Vimeo demo under three minutes
- [ ] Complete Devpost submission form before deadline
