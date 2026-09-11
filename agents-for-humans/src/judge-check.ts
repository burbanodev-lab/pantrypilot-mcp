import { McpClient } from '@strands-agents/sdk'

const mcpUrl = process.env.PANTRYPILOT_MCP_URL ?? 'http://127.0.0.1:3000/mcp'
const requiredTools = [
  'pantry_upsert',
  'prefs_set',
  'meal_plan',
  'shop_list_build',
  'product_search',
  'cart_draft',
  'session_recall',
  'kitchen_run',
]

async function main() {
  const client = new McpClient({ url: mcpUrl })
  try {
    await client.connect()
    const tools = await client.listTools()
    const names = tools.map((tool) => tool.name).sort()

    const missing = requiredTools.filter((name) => !names.includes(name))
    if (missing.length > 0) {
      throw new Error(`Missing required PantryPilot MCP tools: ${missing.join(', ')}`)
    }

    const recallTool = tools.find((tool) => tool.name === 'session_recall')
    if (!recallTool) throw new Error('session_recall tool not found after validation')

    const recall = await client.callTool(recallTool, {
      householdId: 'agents-for-humans-judge',
    })

    console.log(JSON.stringify({
      ok: true,
      strandsSdk: '@strands-agents/sdk',
      mcpUrl,
      discoveredTools: names,
      directStrandsMcpInvocation: {
        tool: 'session_recall',
        result: recall,
      },
    }, null, 2))
  } finally {
    await client.disconnect().catch(() => undefined)
  }
}

main().catch((error) => {
  console.error('STRANDS JUDGE CHECK FAILED', error)
  process.exitCode = 1
})
