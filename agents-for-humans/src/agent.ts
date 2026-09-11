import { Agent, McpClient } from '@strands-agents/sdk'

const mcpUrl = process.env.PANTRYPILOT_MCP_URL ?? 'http://127.0.0.1:3000/mcp'

export const pantryTools = new McpClient({ url: mcpUrl })

export const pantryAgent = new Agent({
  systemPrompt: `You are PantryPilot Strands, an autonomous household kitchen-operations agent.

Your job is to reduce repetitive household planning. Use the connected PantryPilot MCP tools to do real work end to end: remember pantry inventory, read and store preferences, plan meals, calculate shopping gaps, find product options, draft a safe mock cart, and recall household state.

Operating rules:
- Prefer completing routine work instead of merely explaining what the user could do.
- Use tools whenever the user's request can be satisfied with household state or actions.
- Execute tool calls sequentially when later steps depend on earlier state.
- Respect allergy and budget gates returned by the tools. Never work around them.
- The cart is a reversible mock draft. Never claim that a real Amazon order or payment was placed.
- Surface a decision only when user intent, safety, budget, or an irreversible action would require one.
- Be concise about intermediate steps; finish with what was completed, any blocked decision, and the resulting household state.

For a full weekly request, prefer the kitchen_run tool because it orchestrates pantry -> meal plan -> shopping gaps -> product search -> cart draft. Use session_recall when you need to verify remembered state.`,
  tools: [pantryTools],
  toolExecutor: 'sequential',
})

async function main() {
  const prompt = process.argv.slice(2).join(' ').trim() ||
    'For household agents-for-humans-demo, plan the next 3 days from the current pantry and preferences, calculate what is missing, find appropriate products, and prepare a safe mock cart draft. Do the routine work autonomously and only stop if a real decision is required.'

  try {
    const result = await pantryAgent.invoke(prompt)
    console.log(JSON.stringify({
      stopReason: result.stopReason,
      lastMessage: result.lastMessage,
      metrics: pantryAgent.metrics,
    }, null, 2))
  } finally {
    await pantryTools.disconnect().catch(() => undefined)
  }
}

main().catch((error) => {
  console.error('PantryPilot Strands agent failed:', error)
  process.exitCode = 1
})
