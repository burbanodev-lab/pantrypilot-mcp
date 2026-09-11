# PantryPilot — Grok Judge Closeout Directive

**Competition:** Build, Ship, Shape: Amazon Developer Hackathon  
**Devpost project:** https://devpost.com/software/pantrypilot-sytrm1  
**Demo:** https://www.youtube.com/watch?v=U24ZL9LqIsw  
**Repository:** https://github.com/burbanodev-lab/pantrypilot-mcp  
**Status:** `SUBMITTED` — Devpost confirmation received 2026-09-11.  
**Primary track:** Alexa+  
**Target mini-challenges:** AWS Builder + Open Source  

## Mission

Do a **judge-closeout pass**, not another feature sprint. The goal is to maximize the probability that a judge can understand, trust, run, and score PantryPilot quickly.

Work in this order:

1. **Public Devpost entry and demo** — what judges see first.
2. **Judge execution path** — can a clean machine validate the product quickly?
3. **Amazon-specific documentation** — no stale or distracting competition copy above the fold.
4. **Evidence and polish** — screenshots, architecture, testing evidence, failure modes, friction log.
5. **Only then** fix code if a judge-facing check fails.

Do **not** start speculative features, broad refactors, or unrelated GenAI Open Agent work during this closeout.

---

# 1. Devpost authenticated audit — highest priority

Open the submitted PantryPilot project in the authenticated entrant account and inspect every editable section/tab. Preserve submission status. If Devpost requires an explicit re-submit after edits, save/re-submit before ending.

Verify and correct all of the following:

- Project name: **PantryPilot**.
- Primary track: **Alexa+**.
- Mini-challenges: **AWS Builder** and **Open Source** wherever the form allows both to be entered.
- Public repository: `https://github.com/burbanodev-lab/pantrypilot-mcp`.
- GitHub username: `burbanodev-lab` if requested.
- Demo video: `https://www.youtube.com/watch?v=U24ZL9LqIsw`.
- Product feedback is present in the actual submission, not only in the repository.
- Amazon-specific friction log evidence is present or linked where the form permits.
- Testing/judge instructions are present and concise.
- Open-source contribution metadata is complete and makes clear this is a new MIT project created during the hackathon window.
- AWS Builder copy explicitly names **Amazon Bedrock Runtime**, `@aws-sdk/client-bedrock-runtime`, and **Converse**.
- Alexa+ copy explicitly names **MCP 2025-11-25**, **Streamable HTTP**, durable household state, `kitchen_run`, structured media cards, and session recall.
- Any pre-existing-work question is answered accurately: PantryPilot was created during this Amazon hackathon window; unrelated later competition work must not be used to inflate Amazon eligibility.
- Team/entrant identity fields are correct.
- No required field is blank.

### Built With

Where Devpost has technology tags, use the most relevant exact set available, prioritizing:

`Alexa+`, `Model Context Protocol`, `MCP`, `TypeScript`, `Node.js`, `Amazon Bedrock`, `AWS SDK`, `SQLite`, `Docker`.

Do not add technologies that are not actually exercised by the project.

### Story / description quality

The first screenful must answer, without scrolling through implementation trivia:

1. **Problem:** pantry state, dietary constraints, meal planning, shopping gaps, and cart preparation are fragmented.
2. **Solution:** PantryPilot is one persistent Alexa+-ready kitchen operations agent.
3. **Why it is agentic:** it orchestrates multiple tools over durable state instead of answering one prompt.
4. **Proof:** `kitchen_run`, MCP 2025-11-25 Streamable HTTP, session recall, safety gates, structured media cards.
5. **Safety:** mock/reversible cart flow; no real purchase or money movement.
6. **Impact:** less repeated household planning and fewer disconnected steps from pantry to shopping plan.

Avoid vague AI marketing. Prefer concrete runtime behavior and judge-verifiable claims.

### Gallery / images

If the Devpost gallery is empty, weak, or generic, add real product screenshots. Preferred 4–6 assets:

1. Hero screenshot of the companion experience.
2. Pantry + preferences/state view.
3. `kitchen_run` result showing meal plan → shortages → products → cart draft.
4. Safety evidence: allergy/budget gate behavior.
5. Architecture diagram or MCP flow.
6. CI/conformance or judge-validation evidence, only if visually legible.

Use real screenshots from the working product. Do not fabricate functionality.

### Live app URL

If a live/demo URL is shown in Devpost, open it in a logged-out/incognito browser. A judge-facing URL must not land on `401 Bearer token required` or an unusable raw endpoint.

- If a public companion URL works without credentials, use it.
- If the hosted MCP endpoint requires Bearer and there is no public judge UI, **do not advertise that gated URL as the main live demo**. Prefer the video + local judge instructions rather than sending judges to a dead end.

---

# 2. Demo video validation

Validate `https://www.youtube.com/watch?v=U24ZL9LqIsw` from a logged-out/incognito session.

Required:

- Public, not private/unlisted if the contest requires public.
- English narration/on-screen explanation.
- Under 3:00.
- No copyrighted/background audio that obscures narration.
- No exposed credentials, tokens, email auth codes, or AWS secrets.
- Demonstrates the product, not only slides/code.

The strongest 3-minute story is:

1. Problem + one-sentence promise.
2. MCP 2025-11-25 / tool discovery proof.
3. Stock pantry + preferences / remembered household state.
4. Run `kitchen_run` and show the whole agentic chain.
5. Show session recall and allergy/budget safety.
6. Show Bedrock integration evidence only if it is truthful and visible; deterministic fallback is acceptable for reproducibility.
7. Close with the customer value and Alexa+ fit.

If the existing video misses a judge-critical fact, prefer improving the Devpost Story/gallery first unless re-recording materially increases judging clarity.

---

# 3. Repository — Amazon judge-first cleanup

The repository currently works, but several docs still contain stale or competing-contest framing. Fix these without changing working behavior.

## README.md

Make the Amazon submission the clear above-the-fold context.

- Keep title + concise Amazon Alexa+ value proposition first.
- Add a **Judge Quick Start** near the top:

```bash
git clone https://github.com/burbanodev-lab/pantrypilot-mcp.git
cd pantrypilot-mcp
npm ci
npm run verify-submission
npm start
```

Then: open `http://127.0.0.1:3000/companion/` → **Stock sample pantry** → **Run weekly kitchen**.

- Move the **GenAI Open Agent 2026** section below the Amazon hackathon/judge material, or clearly mark it as separate future/parallel context. It must not make an Amazon judge wonder which competition the repo is actually submitted to.
- Keep the safety boundary prominent: mock cart, no real order/payment.
- Ensure tool counts are consistent with actual `tools/list` output and automated checks; do not hard-code an obsolete exact count.
- Link to the Devpost submission and demo near the judge section.

## SUBMISSION.md

It is stale. Update the final gates and URLs:

- Demo video is now published: `https://www.youtube.com/watch?v=U24ZL9LqIsw`.
- Devpost entry is submitted: `https://devpost.com/software/pantrypilot-sytrm1`.
- Mark final Devpost submission complete.
- Do not claim live Bedrock proof if no authorized `source: bedrock` evidence exists; keep that as optional enhancement, not an unfulfilled eligibility blocker unless the official form requires it.

## FAILURE_MODES.md

The opening currently says it is a draft for **GenAI Open Agent judges**. Change it to Amazon/shared judge language.

Keep the useful failure table, especially:

- Bedrock fallback.
- stale MCP sessions.
- durable DB.
- allergen/budget gates.
- hosted `/mcp` Bearer-auth friction.

Make judge access guidance explicit and current.

## FRICTION_LOG.md

The first Amazon-relevant entries are strong, but later entries mix in GenAI prep. For Amazon judging:

- Keep Amazon/MCP/Bedrock friction first and prominent.
- Move unrelated future-competition notes to an appendix or clearly labeled non-Amazon section.
- If Devpost allows a friction-log URL/text field, give judges the Amazon-specific entries rather than making them filter through another competition's preparation.

## package.json

The description currently mentions both Amazon Alexa+ and GenAI Open Agent. Prefer Amazon-first wording for the submitted branch/repo during Amazon judging, while remaining factually accurate.

---

# 4. One-page judge packet

Create/update a concise `JUDGES.md` that a reviewer can understand in ~60 seconds.

It should contain:

- What PantryPilot is.
- Why it belongs in Alexa+.
- 4 judging criteria mapping:
  - **Tech Implementation:** MCP 2025-11-25, Streamable HTTP, SQLite state, conformance tests, Bedrock path.
  - **Design:** companion UI, media cards, one coherent kitchen workflow.
  - **Potential Impact:** recurring household meal/shopping coordination.
  - **Quality of Idea:** persistent state + safe multi-tool orchestration instead of one-shot chatbot.
- Exact quick-start commands.
- Devpost link.
- Video link.
- Repo link.
- Safety boundary.
- Known limitations stated briefly and confidently.

Do not make `JUDGES.md` a wall of text.

---

# 5. Technical judge-readiness QA

Run this on the final commit:

```bash
npm ci
npm run verify-submission
```

`verify-submission` must remain the authoritative aggregate check and currently includes build, submission audit, Alexa add-on check, raw MCP conformance, smoke, judge-check, and evals.

Also validate:

```bash
docker compose up --build
```

Then manually verify:

- `/health` works.
- `/companion/` loads locally.
- **Stock sample pantry** works.
- **Run weekly kitchen** completes.
- `session_recall` reflects state.
- Allergy gate blocks a forbidden ingredient/product path.
- Budget gate rejects an over-ceiling draft.
- Cart remains mock/reversible and does not place an order.
- Persistence survives a process restart with the same `DATABASE_PATH`/Docker volume if feasible.

If any judge-facing check fails, fix it on a `grok/<slug>` branch, run the complete validation suite, and open a PR with a full HANDOFF. Do not merge speculative changes just because they are interesting.

Run/confirm CI on the final Amazon-facing commit. Do not leave `main` red.

---

# 6. Security and credibility pass

Before declaring judge-ready:

- No AWS access keys, session tokens, OAuth tokens, Devpost cookies, `.env` secrets, or private credentials in git/history-visible new commits, screenshots, video, logs, or docs.
- `.env.example` contains placeholders only.
- MIT LICENSE remains present/public.
- Repository is public and cloneable logged out.
- Video is viewable logged out.
- Devpost entry is viewable logged out.
- No docs claim a real Amazon purchase/order integration; product search/cart are intentionally mock unless that changes truthfully.
- No docs imply prize money has been won or paid.

---

# 7. Judge-facing consistency audit

Search the default branch for stale phrases and resolve contradictions, especially:

- `Devpost suspended`
- `submission pending`
- `record demo`
- `Draft for GenAI Open Agent judges`
- stale demo URLs
- stale track/mini-challenge wording
- inconsistent tool counts
- claims of live Bedrock when only the deterministic path was demonstrated

The same facts must match across:

- Devpost Story/fields.
- `README.md`.
- `SUBMISSION.md`.
- `RULES_COMPLIANCE.md`.
- `JUDGES.md`.
- Demo/video description if editable.

---

# 8. Final evidence report

Create `JUDGE_READINESS_REPORT.md` with a compact PASS/FAIL table containing at least:

- Devpost public entry accessible.
- Submission still confirmed after any edits.
- Alexa+ selected.
- AWS Builder selected/entered.
- Open Source selected/entered.
- Video public / English / <3:00.
- Repo public.
- MIT license.
- `npm ci` PASS.
- `npm run verify-submission` PASS.
- Docker build/run PASS.
- Companion happy path PASS.
- MCP 2025-11-25 conformance PASS.
- persistence PASS or exact limitation.
- allergy gate PASS.
- budget gate PASS.
- no secrets observed.
- judge-facing links all open logged out.
- final CI green.

For anything Grok cannot independently verify, use **UNVERIFIED** rather than inventing PASS.

---

# 9. Definition of DONE

Judge closeout is complete only when:

1. Devpost remains **SUBMITTED** after final edits.
2. Alexa+ and intended mini-challenge entries are visibly correct in the authenticated form.
3. Video is judge-accessible and meets contest constraints.
4. Public Devpost/GitHub/video links work logged out.
5. A judge can clone and run `npm run verify-submission` successfully.
6. The companion happy path works without AWS credentials.
7. Amazon-specific README/Submission/Failure/Friction docs no longer look like a different competition's submission.
8. Safety gates and mock-cart boundary are explicit.
9. Main/CI is green.
10. `JUDGE_READINESS_REPORT.md` has no unresolved **FAIL** on an eligibility or judge-access item.

If the only remaining item requires Samuel's personal authenticated action or acceptance, report exactly:

- URL/page.
- Field/checkbox/button name.
- Exact value/text to enter.
- Why Grok cannot complete it.

Do not merely say “human action required.”

---

# Operating constraints

- Preserve the already-confirmed Devpost submission.
- No alternate Devpost accounts.
- No real purchase, financial transaction, or credential exposure.
- No fake screenshots or invented evidence.
- Do not optimize for commit count. Optimize for judge comprehension and score.
- Prefer small, evidence-backed fixes over risky refactors.
- Do not reopen unrelated competition work until Amazon judge closeout is PASS.

**Pipeline:** `SUBMITTED → REVIEW → REWARDED → PAID`  
**Cash accounting:** nominal prizes are not earnings; `REWARDED` and `PAID` remain separate.