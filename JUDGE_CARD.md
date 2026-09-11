# PantryPilot — Judge Quickstart

> A 5-minute verification card for the Amazon Alexa+ hackathon submission.

## What to verify

PantryPilot is a stateful kitchen operations agent exposed as a self-hosted MCP server. The core judging path is intentionally credential-free and does not place orders or transfer funds.

## 1. Install and build

```bash
npm install
npm run build
```

## 2. Verify Alexa+ MCP compatibility

```bash
npm run mcp-conformance
```

Expected result: the raw HTTP probe negotiates MCP `2025-11-25`, obtains an MCP session ID, initializes the session, discovers tools, rejects an invalid session, and closes the session.

## 3. Exercise the agent workflow

```bash
npm run smoke
npm run demo
npm run eval
```

The important workflow is `kitchen_run`: pantry state + household preferences -> meal plan -> ingredient gaps -> product discovery -> reversible cart draft. `session_recall` demonstrates durable household context.

## 4. Run submission checks

```bash
npm run judge-check
npm run submission-audit
```

These checks validate judge-critical files and submission evidence without requiring AWS credentials.

## 5. Try the companion experience

```bash
npm start
```

Open `http://127.0.0.1:3000/companion/`, choose **Stock sample pantry**, then **Run weekly kitchen**.

## Optional AWS Builder proof

With authorized AWS configuration only:

```bash
export AWS_REGION=us-east-1
export BEDROCK_MODEL_ID=<supported-model-id>
npm start
```

PantryPilot uses the Amazon Bedrock Runtime Converse API when configured and otherwise uses its deterministic local path. No credentials are stored in this repository.

## Safety boundary

Product discovery and cart creation are demonstrative. PantryPilot creates a draft only: it does **not** make an external purchase or transfer funds.

## Evidence map

| Judge question | Evidence |
| --- | --- |
| Is it MCP 2025-11-25 over Streamable HTTP? | `src/server.ts`, `scripts/mcp-conformance.ts` |
| Is it agentic rather than a single API wrapper? | `kitchen_run` orchestration + persistent household/session state |
| Can it be judged without credentials? | deterministic path + `npm run eval` + `npm run judge-check` |
| Does it integrate AWS? | `@aws-sdk/client-bedrock-runtime` + Bedrock Converse path |
| Is the project reproducible? | Node 20+, Docker, CI, smoke/conformance/eval scripts |
| Does it perform real purchases? | No; cart operations stop at a reversible draft |

For the full submission narrative, architecture, product feedback, limitations, and timed demo storyboard, see [`SUBMISSION.md`](./SUBMISSION.md).
