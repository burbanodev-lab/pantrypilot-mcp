# PantryPilot — Amazon Developer Hackathon Submission

## Primary track

**Alexa+**

PantryPilot is a stateful household food agent exposed as a self-hosted Model Context Protocol server. It turns pantry state and household preferences into a multi-step workflow: remember context → plan meals → identify shortages → discover products → draft a cart → require an explicit confirmation before changing cart state.

The MCP server negotiates protocol version **2025-11-25**, satisfying the Alexa+ track minimum.

## Mini challenges

### AWS Builder

PantryPilot contains a documented Amazon Bedrock integration in `src/bedrock.ts`. When `AWS_REGION` and `BEDROCK_MODEL_ID` are configured, `meal_plan` invokes Bedrock Converse for structured meal generation. The server deliberately retains a deterministic fallback so judges can exercise the complete MCP workflow without AWS credentials.

This is not a single-turn Bedrock wrapper: the model output participates in a stateful MCP workflow spanning pantry inventory, preferences, planning, shortage calculation, product discovery, cart drafting, confirmation and later session recall.

### Open Source

Repository: `burbanodev-lab/pantrypilot-mcp`

The project was created as a public MIT-licensed repository during the hackathon window. The contribution includes the MCP server, Bedrock integration, Docker packaging, smoke test, friction log, product feedback and submission documentation.

## Why it is more than a basic MCP wrapper

Amazon's rules distinguish a basic API wrapper from creative Alexa+ entries that orchestrate services autonomously and maintain state across sessions. PantryPilot is designed around that distinction:

- persistent-in-process household state keyed by household/session;
- ten composable MCP tools instead of one Q&A endpoint;
- structured meal and product media-card payloads for companion Alexa+ experiences;
- an explicit cart draft/confirm boundary instead of silently performing a purchase;
- optional Bedrock reasoning embedded in a deterministic, testable workflow;
- local and Docker execution without requiring judges to possess AWS credentials.

## Three-minute demo storyboard

**0:00–0:20 — Problem and architecture**
Show the README architecture. Explain that household food planning is fragmented across inventory, preferences, recipes and shopping, while PantryPilot exposes one stateful agent workflow to Alexa+.

**0:20–0:35 — MCP compliance**
Run `npm run smoke`. Show successful `initialize` negotiation at `2025-11-25` and `tools/list` returning the tool surface.

**0:35–1:35 — Stateful Alexa+ workflow**
Use the MCP client to:
1. call `session_recall`;
2. add eggs, milk and rice with `pantry_upsert`;
3. set servings/diet with `prefs_set`;
4. call `meal_plan` for three days;
5. show structured meal `mediaCard` output.

**1:35–2:20 — Agentic shopping workflow**
Call `shop_list_build`, then `product_search`, `cart_draft`, and `cart_confirm`. Emphasize that this is a mock cart and no real purchase or transfer occurs. Show `session_recall` proving state survived across the workflow.

**2:20–2:40 — AWS Builder evidence**
Show `src/bedrock.ts` and a configured run where `meal_plan` reports `source: "bedrock"`. Explain the Converse integration and deterministic fallback.

**2:40–2:55 — Reliability and developer feedback**
Show Docker support, smoke test, `FRICTION_LOG.md`, and `PRODUCT_FEEDBACK.md`.

**2:55–3:00 — Close**
"PantryPilot turns Alexa+ from a pantry Q&A bot into a stateful household workflow that can plan, reason, remember and prepare shopping safely."

## Submission description

**PantryPilot** is a stateful Alexa+ food-planning agent delivered as a self-hosted MCP server. A household can stock its pantry, save dietary preferences, generate multi-day meal plans, calculate ingredient shortages, discover mock products, draft a cart, explicitly confirm it, and recall the resulting state later. The project uses Streamable HTTP and negotiates MCP `2025-11-25`. Its optional Amazon Bedrock Converse integration generates structured meal plans while a deterministic fallback keeps the entire demo reproducible without cloud credentials. Rather than wrapping one API, PantryPilot exposes ten composable tools and carries household/session context through an end-to-end agentic workflow. Structured `mediaCard` payloads make meal and product results suitable for a companion Alexa+ experience. No real order or financial transaction is performed.

## Product feedback checklist

Before final submission, copy/refine evidence from `PRODUCT_FEEDBACK.md` and `FRICTION_LOG.md` into Devpost:

- tools/APIs/SDKs used and why;
- what worked well;
- what needs work;
- onboarding experience;
- whether we would build with them again;
- AWS service used and how (Bedrock Converse);
- friction entries with task, steps, expected/actual, severity, workaround, suggestion.

## Final submission gates

- [x] Public source repository
- [x] MIT license
- [x] MCP minimum protocol `2025-11-25`
- [x] Working self-hosted MCP implementation
- [x] AWS Bedrock integration documented in source
- [x] README setup/run instructions
- [x] Docker packaging
- [x] MCP smoke test
- [x] Product feedback document
- [x] Friction log
- [x] Primary Alexa+ submission copy drafted
- [x] AWS Builder mini-challenge copy drafted
- [x] Open Source mini-challenge evidence drafted
- [ ] Run and capture a live Bedrock-backed demo (`source: bedrock`)
- [ ] Record and publish <=3 minute YouTube/Vimeo demo
- [ ] Join hackathon / complete Devpost submission form
- [ ] Paste final Product Feedback + friction entries into Devpost
