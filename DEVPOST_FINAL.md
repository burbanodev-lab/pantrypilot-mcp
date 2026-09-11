# PantryPilot — Final Devpost Handoff

## Current pipeline

`SUBMITTED → REVIEW → REWARDED → PAID`

Devpost submission was independently confirmed by email on **2026-09-11 19:33:46 UTC** with subject **“Submission confirmed: PantryPilot”**.

## Final URLs

- Hackathon: https://amazonappdev2026.devpost.com/
- Devpost project: https://devpost.com/software/pantrypilot-sytrm1
- Repository: https://github.com/burbanodev-lab/pantrypilot-mcp
- YouTube channel: https://www.youtube.com/@burbanodev
- Demo video: https://www.youtube.com/watch?v=U24ZL9LqIsw
- Live MCP health/demo reference: https://pantrypilot.mcpize.run

The public Devpost URL exists and Devpost has confirmed the submission. Search-engine indexing may lag, so absence from public search results is not evidence that the submission is missing.

## Devpost project fields

### Project name
PantryPilot

### Submission title
PantryPilot — a stateful Alexa+ kitchen operations agent over MCP

### Tagline
Turn pantry state, dietary preferences, meal planning, shopping gaps, product discovery, and a safe cart draft into one persistent agentic workflow.

### Primary track
Alexa+

### Mini challenges
- AWS Builder
- Open Source

### Repository / contribution URL
https://github.com/burbanodev-lab/pantrypilot-mcp

### GitHub username
`burbanodev-lab`

### Demo video
https://www.youtube.com/watch?v=U24ZL9LqIsw

### Short description
PantryPilot is a stateful Alexa+ kitchen operations agent delivered as a self-hosted MCP server. A household can stock its pantry, save dietary preferences, generate multi-day meal plans, calculate ingredient shortages, discover product options, draft a safe cart, and recall the resulting state later. It uses MCP `2025-11-25` over Streamable HTTP, durable SQLite-backed household state, structured media cards, safety gates for allergens and budget, and an optional Amazon Bedrock Converse path with a deterministic credential-free fallback for judging.

## Judge validation

```bash
git clone https://github.com/burbanodev-lab/pantrypilot-mcp.git
cd pantrypilot-mcp
npm install
npm run verify-submission
npm start
```

Then open `http://127.0.0.1:3000/companion/`, choose **Stock sample pantry**, and run **Run weekly kitchen**.

Expected evidence includes MCP `2025-11-25` negotiation, tool discovery, persistent household state, `kitchen_run` orchestration, shopping gaps, media cards, cart draft, recall, allergen filtering, and budget ceilings.

## Post-submit quality checks

These are not blockers to `SUBMITTED`, but should be verified in the editable Devpost project while edits remain allowed:

- Confirm the demo video renders and remains Public, English, and under 3:00.
- Confirm Alexa+ is the primary track and AWS Builder + Open Source are selected where allowed.
- Confirm the GitHub repository/contribution URL is present and clickable.
- Confirm Product Feedback and the friction log evidence are visible in the submitted answers.
- Confirm the Story makes the stateful MCP workflow obvious within the first screenful.
- Confirm screenshots/gallery media show the companion UI, pantry state, `kitchen_run` result, shopping gaps/cart draft, and protocol/test evidence.
- Confirm “Built With” includes the strongest judge-relevant technologies: Alexa+, MCP, TypeScript, Node.js, Amazon Bedrock, AWS SDK, SQLite/sql.js, Docker.
- Confirm “Try it out” includes the GitHub repository and any judge-accessible live/demo endpoint that does not expose secrets.

## Submission evidence

- [x] Devpost account reinstated
- [x] Amazon Developer Hackathon registration confirmed
- [x] Public GitHub repository
- [x] MIT license
- [x] Alexa+ MCP implementation
- [x] AWS Builder code path
- [x] Open Source evidence
- [x] Product feedback prepared
- [x] Friction log prepared
- [x] Demo video URL supplied
- [x] Devpost project URL supplied
- [x] Final submission confirmed by Devpost email
- [x] Pipeline changed to `SUBMITTED`

## Cash accounting

Never call nominal prize money earnings.

`SUBMITTED → REVIEW → REWARDED → PAID`

Target cumulative **PAID ≥ US$5,000**.
