# Amazon Developer Hackathon — Rules Compliance Matrix

Verified against the official Devpost overview/rules for **Build, Ship, Shape: Amazon Developer Hackathon** and current entrant status on 2026-09-11.

Official competition: https://amazonappdev2026.devpost.com/
Official rules: https://amazonappdev2026.devpost.com/rules

## Competition facts

| Item | Official requirement / fact | PantryPilot status |
|---|---|---|
| Submission deadline | October 23, 2026 at 12:00 PM Pacific Time | OPEN |
| Devpost entrant account | Must be able to join/submit | REINSTATED — Devpost Support removed suspension flag on 2026-09-11 |
| Hackathon registration | Entrant must join the hackathon | COMPLETE — registration confirmation received 2026-09-11 |
| Primary track | Alexa+ | SELECTED / VERIFY ON PUBLIC ENTRY |
| Alexa+ 1st prize | US$25,000 cash + US$15,000 AWS credits | TARGET |
| Alexa+ 2nd prize | US$15,000 cash + US$5,000 AWS credits | ELIGIBLE IF RANKED |
| Alexa+ 3rd prize | US$4,000 cash + US$1,000 AWS credits | ELIGIBLE IF RANKED |
| AWS Builder mini challenge | US$5,000 cash + US$5,000 AWS credits | TARGETED / VERIFY ON PUBLIC ENTRY |
| Open Source mini challenge | US$5,000 cash + US$5,000 AWS credits | TARGETED / VERIFY ON PUBLIC ENTRY |
| Multiple prizes | One track prize + one mini-challenge prize maximum per project | ACKNOWLEDGED |
| Purchase/payment to enter | Not required | COMPLIANT |
| Public repository | Required as part of working demo/code submission | COMPLIANT |
| Product feedback | Required | PREPARED; VERIFY INCLUDED IN SUBMISSION |
| Friction log | Optional; can add up to 10% judging bonus | PREPARED; VERIFY INCLUDED IN SUBMISSION |
| Working demo | Required | IMPLEMENTED |
| Demo video | YouTube or Vimeo, public, English, under 3 minutes | URL PROVIDED: https://www.youtube.com/watch?v=U24ZL9LqIsw |
| Final Devpost submission | Must be submitted before deadline | CONFIRMED — Devpost email 2026-09-11 19:33:46 UTC |
| Public Devpost project URL | Submission/project evidence | https://devpost.com/software/pantrypilot-sytrm1 |

## Alexa+ technical compliance

| Requirement | Evidence |
|---|---|
| Self-hosted MCP server | `src/server.ts` |
| Streamable HTTP | `StreamableHTTPServerTransport` in `src/server.ts` |
| MCP protocol 2025-11-25 | Runtime negotiation + `scripts/mcp-conformance.ts` |
| Tool discovery | `tools/list` covered by smoke + raw-wire conformance |
| Stateful agent workflow | `kitchen_run` + SQLite household state |
| Reproducible judging without credentials | deterministic fallback + Docker + judge scripts |
| Safe external actions | cart remains a mock draft/confirm flow; no real purchase or funds transfer |
| Household safety gates | allergen filtering + budget ceilings merged to `main` with eval coverage |

## Judging fit

The official Alexa+ judging guidance explicitly treats an agentic workflow that orchestrates services, maintains state across sessions, supports purchasing-style capabilities, and uses media/cards as creative rather than a basic MCP wrapper. PantryPilot is intentionally structured around those signals: durable household state, multi-step orchestration, cart drafting, and structured media cards.

The four equally weighted judging criteria are Tech Implementation, Design, Potential Impact, and Quality of the Idea. The friction log can add up to a 10% bonus during downselection, so `FRICTION_LOG.md` should remain visible in the submitted answers where possible.

## Mini-challenge compliance

### AWS Builder

PantryPilot incorporates Amazon Bedrock Runtime through `@aws-sdk/client-bedrock-runtime` and Converse. The integration is documented in `README.md`, `SUBMISSION.md`, and source. A live authorized Bedrock capture is desirable evidence, but no credentials are stored in the repository and the credential-free judging path remains reproducible.

### Open Source

PantryPilot is a public MIT-licensed project created during the hackathon window. Submission metadata includes the public repository/contribution URL, GitHub username, creation timestamp, and description of the work. This is stronger than a documentation-only contribution: the repository contains the working MCP server, companion experience, tests/evals, persistence, Bedrock integration, Docker packaging, safety gates, and judge tooling.

## Prize verification and payment path

The official rules state that a potential winner is not a winner until identity/qualification and required post-competition forms are verified. Monetary prizes are paid only after receipt of the completed winner affidavit and other required forms. Required forms must be returned within ten business days after they are sent. Payment may be mailed or sent electronically to the entrant/representative/organization bank account.

Therefore this repository and its status reporting must keep these concepts separate:

- **Nominal prize:** competition amount available to win; not earnings.
- **SUBMITTED:** confirmed Devpost entry; not a prize.
- **REWARDED:** only after sponsor/administrator verification designates the entrant a winner.
- **PAID:** only after the monetary prize is actually received.

## Post-submit checks

- [x] Devpost account reinstated.
- [x] Registered for the hackathon under the authorized entrant account.
- [x] Demo video URL supplied.
- [x] Devpost project URL supplied.
- [x] Final Devpost submission confirmed by email.
- [ ] Verify the public entry shows Alexa+ as the selected primary track.
- [ ] Verify AWS Builder and Open Source mini challenges are attached where allowed.
- [ ] Verify the demo is publicly viewable, in English, and under three minutes.
- [ ] Verify Product Feedback and friction-log evidence survived the final form submission.
- [ ] Verify screenshots/gallery and Built With fields make the judge-relevant MCP/Alexa+/Bedrock implementation obvious.
- [ ] Capture a live authorized Bedrock-backed run if available without exposing credentials; treat as enhancement, not as a prerequisite to `SUBMITTED` unless Devpost explicitly flags it.

Pipeline: `SUBMITTED → REVIEW → REWARDED → PAID`.
