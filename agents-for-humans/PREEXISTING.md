# Pre-existing work disclosure

The Agents for Humans rules permit standard development tools and allow other pre-existing code/work when it is disclosed. This file makes the boundary explicit.

## Existing before the Strands entry work on 2026-09-11

The repository already contained the PantryPilot MCP/domain implementation created on 2026-09-10 and 2026-09-11 during the Agents for Humans submission period, including:

- Streamable HTTP MCP server.
- pantry/preferences/meal/shopping/product/cart tools.
- SQLite-backed household state.
- `kitchen_run` end-to-end orchestration tool.
- companion UI and media cards.
- allergen and budget gates.
- optional Amazon Bedrock meal-plan path.
- MCP conformance, smoke, eval and judge-readiness scripts.

That work was originally prepared for the separate Build, Ship, Shape: Amazon Developer Hackathon.

## New work created specifically for Agents for Humans

Created on/after 2026-09-11 for this entry:

- `agents-for-humans/package.json` using `@strands-agents/sdk`.
- Strands `Agent` orchestration over the PantryPilot MCP tool surface.
- Strands `McpClient` integration with native tool discovery/invocation.
- sequential Strands tool execution for state-dependent household operations.
- Agents for Humans system prompt and autonomous-work policy.
- Strands judge check that proves MCP discovery/invocation without LLM credentials.
- Agents for Humans architecture diagram, README, demo script and submission copy.
- dedicated CI verification for the Strands subproject.

## Why the submission is still a new Strands agent

The submitted agent runtime did not exist before this work. Strands now owns the reasoning/tool loop and consumes the existing domain capabilities as MCP tools. The earlier PantryPilot server acts as the reusable tool/backend layer, while the new Strands layer is the agent submitted to Agents for Humans.

No claim is made that the earlier MCP implementation was created exclusively for this hackathon.
