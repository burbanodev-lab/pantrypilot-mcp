# Amazon Developer Hackathon — Rules Compliance Matrix

Verified against the official Devpost overview/rules for **Build, Ship, Shape: Amazon Developer Hackathon** on 2026-09-10.

Official competition: https://amazonappdev2026.devpost.com/
Official rules: https://amazonappdev2026.devpost.com/rules

## Competition facts

| Item | Official requirement / fact | PantryPilot status |
|---|---|---|
| Submission deadline | October 23, 2026 at 12:00 PM Pacific Time | OPEN |
| Primary track | Alexa+ | SELECTED |
| Alexa+ 1st prize | US$25,000 cash + US$15,000 AWS credits | TARGET |
| Alexa+ 2nd prize | US$15,000 cash + US$5,000 AWS credits | ELIGIBLE IF RANKED |
| AWS Builder mini challenge | US$5,000 cash + US$5,000 AWS credits | TARGETED |
| Open Source mini challenge | US$5,000 cash + US$5,000 AWS credits | TARGETED |
| Multiple prizes | One track prize + one mini-challenge prize maximum per project | ACKNOWLEDGED |
| Purchase/payment to enter | Not required | COMPLIANT |
| Public repository | Required as part of working demo/code submission | COMPLIANT |
| Product feedback | Required | DRAFTED in `SUBMISSION.md` / `FRICTION_LOG.md` |
| Working demo | Required | IMPLEMENTED; recording pending |

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

## Mini-challenge compliance

### AWS Builder

PantryPilot incorporates Amazon Bedrock Runtime through `@aws-sdk/client-bedrock-runtime` and Converse. The integration is documented in `README.md`, `SUBMISSION.md`, and source. A live authorized Bedrock capture remains desirable evidence before submission, but no credentials are stored in the repository.

### Open Source

PantryPilot is a public MIT-licensed project created/expanded during the hackathon window. Submission metadata includes the public repository/contribution URL and description of the work.

## Prize verification and payment path

The official rules state that a potential winner is not a winner until identity/qualification and required post-competition forms are verified. Monetary prizes are paid only after receipt of the completed winner affidavit and other required forms. Required forms must be returned within ten business days after they are sent. Payment may be mailed or sent electronically to the entrant/representative/organization bank account.

Therefore this repository and its status reporting must keep these concepts separate:

- **Nominal prize:** competition amount available to win; not earnings.
- **REWARDED:** only after sponsor/administrator verification designates the entrant a winner.
- **PAID:** only after the monetary prize is actually received.

## Remaining external gates

- [ ] Register for the hackathon in Devpost under the authorized entrant account.
- [ ] Capture a live authorized Bedrock-backed run if available, without exposing credentials.
- [ ] Record and publish the public demo video within the competition limit.
- [ ] Complete and submit the Devpost entry before October 23, 2026 at 12:00 PM PT.
- [ ] Preserve submission confirmation/URL as evidence.

These gates require the entrant's authenticated Devpost/AWS/video-host context and must not be represented as complete until independently evidenced.
