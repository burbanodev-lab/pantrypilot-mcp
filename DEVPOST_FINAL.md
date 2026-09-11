# PantryPilot — Final Devpost Handoff

## Current pipeline

`WORKING → SUBMITTED` is the only priority.

Do not mark `SUBMITTED` until Devpost returns a project/submission confirmation URL or equivalent evidence.

## Final URLs

- Hackathon: https://amazonappdev2026.devpost.com/
- Repository: https://github.com/burbanodev-lab/pantrypilot-mcp
- YouTube channel: https://www.youtube.com/@burbanodev
- Demo video: https://youtu.be/U24ZL9LqIsw
- Live MCP health/demo reference: https://pantrypilot.mcpize.run

Before pressing final Submit, visually confirm the YouTube demo is **Public**, **English**, and **under 3:00**. The automated crawler could not reliably read YouTube short-link metadata, so those three properties are not independently asserted here.

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
https://youtu.be/U24ZL9LqIsw

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

## Required narrative/evidence to include

- Product feedback from `SUBMISSION.md`.
- Friction log: `FRICTION_LOG.md`.
- Alexa+ technical evidence: self-hosted MCP, Streamable HTTP, stateful orchestration, media cards, purchasing-style draft workflow.
- AWS Builder evidence: `@aws-sdk/client-bedrock-runtime` + Converse integration; live Bedrock capture is desirable but not required for the credential-free judging path unless the form explicitly requires runtime proof.
- Open Source evidence: public MIT repository created during the hackathon window, with working implementation rather than documentation-only changes.
- Pre-existing work answer: PantryPilot was created during the Amazon hackathon window; do not claim unrelated later GenAI competition work as part of Amazon eligibility.

## Final checklist

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
- [ ] Confirm demo Public + English + <3:00
- [ ] Paste all Devpost fields
- [ ] Select Alexa+ + AWS Builder + Open Source where allowed
- [ ] Accept entrant terms only through the authorized human account when Devpost requires personal acceptance
- [ ] Press final Submit
- [ ] Capture final Devpost project/submission URL
- [ ] Change pipeline to `SUBMITTED`

## Cash accounting

Never call nominal prize money earnings.

`SUBMITTED → REVIEW → REWARDED → PAID`

Target cumulative **PAID ≥ US$5,000**.
