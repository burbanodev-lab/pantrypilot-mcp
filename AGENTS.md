# AGENTS — PantryPilot coordination

**Metric (strict):** `PAID` cash received. Not commits, not nominal prize size, not “rewarded pending”.

**Active objective:** PantryPilot → Amazon Alexa+ (nominal US$25,000) + Open Source mini (US$5,000). GenAI Open Agent is a parallel path on the same product (build window Oct 2026).

**Human owner:** Samuel Burbano (`burbano.dev@gmail.com`, GitHub `burbanodev-lab`).

---

## Roles (do not collide)

| Agent | Owns | Does not own |
|-------|------|----------------|
| **ChatGPT — Burbano Cash Execution Agent** | Money strategy, critical path to SUBMITTED→REWARDED→PAID, rules/compliance, CI/submission packaging, Devpost paste fields, merge decisions on material PRs | Rewriting Grok adversarial/demo branches without review |
| **Grok — Burbano Bounty Agent** | Adversarial review, judge/demo UX, product bugs, evals/tests on `grok/*` branches, HANDOFF blocks | Duplicating ChatGPT strategy/docs/CI; merging without handoff when ChatGPT is active on the same front |
| **Samuel** | Logins/KYC/keys/store: Devpost, RevenueCat, Play Console, Stripe Connect, AWS/Bedrock secrets, final “Send” on appeals when required | Routine code edits (agents handle those) |

**Rule:** one owner per front. Same file/feature = one writer at a time. Prefer GitHub (branches, PRs, HANDOFF) over chat ping-pong.

---

## Git channel

- Default base: `main` (source of truth after merge).
- Grok branches: `grok/<short-slug>` only.
- Cash/strategy branches: prefer `cash/<short-slug>` (ChatGPT) — do not force-push each other’s branches.
- Open a PR for any material change. PR body **must** include:

```text
## HANDOFF FOR BURBANO CASH EXECUTION AGENT
- Repository:
- Branch:
- Commit:
- PR URL:
- Problem:
- Material change:
- Files:
- Tests run + result:
- Conflicts expected:
- Remaining blocker:
- Recommended next action:
```

- ChatGPT verifies and merges **only** what materially raises probability of SUBMITTED/REWARDED/PAID.
- Grok may merge only when Samuel explicitly forces execution and CI is green, then still posts HANDOFF.

---

## Pipeline states

`FOUND → VERIFIED → WORKING → SUBMITTED → REVIEW → REWARDED → PAID`

Report NOMINAL / REWARDED / PAID separately. Current blocker pattern: Devpost account suspension blocks Amazon + Shipaton SUBMITTED even when product is WORKING.

---

## What “together” means

- **Together on the project, split on the task.** Parallel specialists beat two agents editing the same docs.
- No empty documentation PRs. Next leap is WORKING → SUBMITTED → PAID, not another markdown unless it is paste-ready for judges/Devpost.
- If blocked on a human gate (Devpost, store keys), agents prepare the paste kit and escalate the unlock — they do not invent alternate contest accounts.

---

## Local verify (before PR)

```bash
npm ci && npm run build && npm run smoke && npm run eval && npm run judge-check
```

Add `mcp-conformance` / `alexa-addon-check` when those surfaces change.

---

## Contact

- Work email: `burbano.dev@gmail.com`
- Live MCP (MCPize): see README / `mcpize.yaml` (Bearer often required on public `/mcp`)
