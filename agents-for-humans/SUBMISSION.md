# Devpost submission — PantryPilot Strands

## Project name

**PantryPilot Strands**

## Tagline

A Strands agent that quietly turns pantry state into meal plans, shopping gaps and a safe cart draft — surfacing only decisions that actually need a person.

## Track

**Everyday Agents**

## What it does

Household food planning is repetitive but surprisingly fragmented. People keep a pantry in their head, remember dietary constraints, decide meals, discover missing ingredients, compare products, and rebuild the same shopping context every week.

PantryPilot Strands turns that busywork into one autonomous workflow. A **Strands Agents SDK** agent connects natively to a PantryPilot MCP server. It can remember household inventory and preferences, plan meals, calculate shopping gaps, find matching products, prepare a reversible mock cart, and recall the resulting state later.

The agent is intentionally designed to do routine work quietly. It surfaces a decision only when user intent, an allergy rule, a budget ceiling, or a truly irreversible action would require one.

## How we built it

The new agent layer is TypeScript on Node 22 using **`@strands-agents/sdk` 1.17.0**.

Strands is the actual reasoning/orchestration runtime:

- `Agent` runs the model-driven loop.
- `McpClient` connects directly to the PantryPilot Streamable HTTP MCP endpoint.
- The MCP client is passed into Strands as the tool provider, so PantryPilot tools become native agent tools.
- `toolExecutor: 'sequential'` preserves state-dependent ordering.
- The Strands system prompt tells the agent to finish routine work rather than only describe steps.
- Allergy and budget failures are treated as real decision boundaries, not something the agent may bypass.

The connected MCP backend exposes pantry, preferences, meal planning, shopping list, product search, cart draft and `kitchen_run` orchestration over durable SQLite-backed household state.

Amazon Bedrock is the default model path through Strands when standard AWS credentials/model access are configured. The code repository also includes a credential-free judge check that uses the Strands `McpClient` to connect, discover tools and directly invoke `session_recall`, proving the Strands-to-MCP integration independently of an LLM account.

## Why it matters

This is not a recipe chatbot. The useful unit is the recurring household operation: remember what exists, make a plan, determine what is missing, prepare the next action, and preserve context for next time.

For a household, that means fewer repeated decisions and fewer disconnected lists. For an agent platform, it demonstrates a practical pattern: **Strands reasoning over durable, reusable MCP tools with explicit safety boundaries.**

## Safety

- Allergy and budget gates are enforced by the connected tools.
- Cart behavior is a reversible mock draft.
- PantryPilot Strands does not place a real order, charge a card, or transfer funds.
- The agent is instructed never to work around household constraints.

## Public repository

https://github.com/burbanodev-lab/pantrypilot-mcp

Agents for Humans source and instructions are in:

`/agents-for-humans`

## License

MIT (repository root).

## Architecture diagram

`agents-for-humans/architecture.svg`

## Judge testing

Terminal 1, repository root:

```bash
npm ci
npm run build
npm start
```

Terminal 2:

```bash
cd agents-for-humans
npm install
npm run build
npm run judge-check
```

For a real model-driven Strands run, configure standard AWS credentials with Bedrock model access and run:

```bash
npm run agent -- "For household demo, plan three days from my pantry, calculate gaps, find suitable products, and prepare a safe mock cart. Do routine work autonomously."
```

## Built with

- Strands Agents SDK
- TypeScript
- Node.js
- Model Context Protocol (MCP)
- Amazon Bedrock
- AWS SDK
- SQLite / sql.js
- Express
- Docker

## Pre-existing work disclosure

The PantryPilot MCP/domain server was created on 2026-09-10 and 2026-09-11 during this hackathon's submission period, originally for a separate Amazon developer hackathon. For Agents for Humans, we created a new Strands runtime/orchestration layer, native Strands MCP integration, autonomous agent policy, Strands judge checks, architecture and submission package. The exact boundary is documented in `agents-for-humans/PREEXISTING.md`.

## Challenges we ran into

The main architecture challenge was preserving the value of a stateful domain tool layer while proving that Strands — not a hard-coded workflow — is the submitted agent runtime. Native Strands MCP support solved this cleanly: the agent owns reasoning and selection while the MCP server owns deterministic household state/actions.

A second challenge was judge reproducibility. A full LLM run needs an authorized model provider, but judges should still be able to validate the Strands integration without sharing credentials. The dedicated `judge-check` therefore uses Strands' own MCP client to discover and invoke the tool surface directly.

## Accomplishments we're proud of

- Real Strands agent rather than a README-only SDK mention.
- Native MCP tool-provider integration.
- Stateful household context across repeated operations.
- End-to-end routine workflow via `kitchen_run`.
- Explicit allergy and budget decision boundaries.
- Credential-free Strands integration verification plus a real Bedrock-backed agent path.
- Transparent disclosure of reused work.

## What's next

A production version could deploy the agent runtime with Amazon Bedrock AgentCore, replace the mock product/cart layer with explicitly authorized commerce integrations, add scheduled background runs, and notify the household only when a meaningful decision is required.

## Devpost demo video

**Preferred final video:** record a new public video of at most 5 minutes using the storyboard below. It should visibly show the Strands source, `judge-check`, a real Strands run, the PantryPilot flow, safety boundaries and architecture.

**Temporary submission fallback if the final Strands video is not ready:**

https://www.youtube.com/watch?v=U24ZL9LqIsw

Use this existing public PantryPilot demo only to avoid missing the submission deadline. It demonstrates the working PantryPilot product flow and may be used for the problem / audience / why-it-matters portion of the pitch, but **it predates the Agents for Humans Strands layer and does not demonstrate Strands Agents SDK**. Do not describe it as a Strands demo. Replace it with the dedicated Strands video before the submission deadline if possible.

## AWS Builder ID — required human data

Devpost requires an AWS Builder ID for this hackathon. Enter **the exact email address used to create the entrant's AWS Builder ID**. Do not infer this from the Devpost, GitHub, AWS account-root, or project email. The Builder ID email must be supplied or verified by the entrant at `profile.aws.amazon.com`.

## Demo video storyboard (max 5 minutes)

**0:00–0:30 — Problem / audience / why it matters**  
Households repeatedly reconcile pantry, preferences, meals and shopping. Show the companion UI and the promise: routine kitchen planning should happen as one background operation.

**0:30–1:05 — Strands proof**  
Show `agents-for-humans/src/agent.ts`: `Agent`, `McpClient`, MCP URL, sequential executor. Explain that the MCP client is passed directly into the Strands agent as its tools.

**1:05–1:35 — Reproducible integration check**  
Run `npm run judge-check`. Show Strands connecting, discovering required MCP tools and invoking `session_recall`.

**1:35–3:30 — Real agent run**  
Run the Strands agent with a household request. Show it use PantryPilot tools / `kitchen_run`, then show the resulting plan, gaps, products, cart draft and remembered state in the companion UI or terminal result.

**3:30–4:10 — Safety decisions**  
Show allergy/budget gate behavior and explain that the agent surfaces blocked decisions instead of bypassing constraints.

**4:10–4:35 — Architecture**  
Show the diagram: human -> Strands -> MCP -> state/services.

**4:35–5:00 — Close**  
Restate: PantryPilot Strands does the repetitive planning work end to end and only brings the person back when a decision is real.
