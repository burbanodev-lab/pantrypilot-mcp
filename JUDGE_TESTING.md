# PantryPilot — Judge Testing Protocol

This guide gives judges a deterministic path to verify the Alexa+ submission without AWS credentials, followed by an optional Bedrock-backed verification when AWS access is available.

## 1. Prerequisites

- Node.js 20 or newer
- npm 9 or newer
- No Amazon account, AWS credentials, purchase, or paid service is required for the deterministic path

## 2. Install and build

```bash
npm ci
npm run build
```

Expected result: TypeScript compilation completes successfully.

## 3. Verify MCP wire compliance

```bash
npm run mcp-conformance
```

This probe talks to the server over raw HTTP rather than through the MCP client SDK. It verifies the Streamable HTTP surface, MCP `2025-11-25` negotiation, session creation, initialized notification, tool discovery, invalid-session rejection, and session shutdown.

Then run:

```bash
npm run smoke
```

Expected result includes successful initialization with protocol `2025-11-25` and a non-empty tool list.

## 4. Verify the agent workflow

```bash
npm run eval
npm run judge-check
```

The evaluation covers the household workflow and a safe failure path. The judge check validates submission-critical invariants without requiring AWS credentials.

For a visible demo:

```bash
npm start
```

Open `http://127.0.0.1:3000/companion/`, choose **Stock sample pantry**, then **Run weekly kitchen**. The `kitchen_run` tool orchestrates pantry state, preferences, meal planning, shortage calculation, product discovery, and cart drafting while returning a step log and media-card data.

## 5. State and safety checks

Call `session_recall` after the workflow to inspect household context. Cart operations are mock operations only: PantryPilot does not place an Amazon order, charge a card, transfer money, or require payment credentials. The explicit draft/confirm boundary is part of the workflow design.

## 6. Optional Amazon Bedrock verification

The deterministic path above is the primary reproducible judging path. To verify the AWS Builder integration, provide AWS credentials through the normal AWS SDK credential chain and set:

```bash
export AWS_REGION=us-east-1
export BEDROCK_MODEL_ID=<a Bedrock model available to the judge account>
npm start
```

Invoke `meal_plan`. A successful Bedrock-backed response reports `source: "bedrock"`. If Bedrock configuration is absent, invocation fails, or model output cannot be parsed, PantryPilot deliberately falls back to the deterministic planner so the Alexa+ MCP workflow remains testable.

No credentials are stored in this repository.

## 7. Docker alternative

```bash
docker compose up --build
```

The service exposes `/mcp`, `/health`, and `/companion/`. AWS environment variables may be forwarded from the host when the optional Bedrock path is being tested.

## 8. What to inspect in source

- `src/server.ts` — MCP Streamable HTTP server and sessions
- `src/tools.ts` — composable tools and `kitchen_run`
- `src/bedrock.ts` — Amazon Bedrock Converse integration
- `src/db.ts` / `src/state.ts` — durable household state
- `apps/companion/` — simulated Alexa+ companion experience
- `scripts/mcp-conformance.ts` — raw protocol verification
- `evals/` — deterministic evaluation scenarios
- `PRODUCT_FEEDBACK.md` and `FRICTION_LOG.md` — required product/developer feedback evidence

## 9. Submission evidence

Primary track: **Alexa+**  
Mini challenges: **AWS Builder** and **Open Source**  
Repository license: **MIT**  
Required MCP transport: **Streamable HTTP**  
Negotiated MCP protocol: **2025-11-25**
