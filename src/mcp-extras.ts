/**
 * MCP resources + prompts for GenAI Open Agent (Track 04/05).
 * Resources expose durable pantry/household snapshots; prompts steer kitchen_run.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getOrCreateHousehold,
  listKnownHouseholdIds,
  serializePantry
} from './state.js';

function pantrySnapshot(householdId: string) {
  const h = getOrCreateHousehold(householdId);
  const pantry = serializePantry(h);
  const expiring = pantry
    .filter((p) => p.expiresAt)
    .sort((a, b) => String(a.expiresAt).localeCompare(String(b.expiresAt)))
    .slice(0, 8);
  return {
    householdId: h.householdId,
    updatedAt: h.updatedAt,
    prefs: h.prefs,
    pantryCount: pantry.length,
    pantry,
    expiringSoon: expiring,
    mealPlanSlots: h.mealPlan.length,
    shopListCount: h.shopList.length,
    cartStatus: h.cart?.status ?? null
  };
}

export function registerResourcesAndPrompts(server: McpServer): void {
  server.registerResource(
    'agent-overview',
    'pantry://agent/overview',
    {
      title: 'PantryPilot agent overview',
      description: 'What this kitchen MCP agent does and which tools to prefer.',
      mimeType: 'text/markdown'
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: [
            '# PantryPilot',
            '',
            'Stateful kitchen operations agent over MCP (protocol 2025-11-25).',
            '',
            '- Prefer tool `kitchen_run` for pantry → meal_plan → shop → products → cart.',
            '- Durable memory: SQLite via DATABASE_PATH.',
            '- Resources: `pantry://household/{id}` for pantry/prefs snapshots.',
            '- Prompts: `use_up_expiring`, `weekly_kitchen`.',
            '- Cart is mock-only — never places a real order.'
          ].join('\n')
        }
      ]
    })
  );

  server.registerResource(
    'household-pantry',
    new ResourceTemplate('pantry://household/{householdId}', {
      list: async () => ({
        resources: listKnownHouseholdIds().map((id) => ({
          uri: `pantry://household/${encodeURIComponent(id)}`,
          name: `Household ${id}`,
          description: `Pantry + prefs snapshot for household ${id}`,
          mimeType: 'application/json'
        }))
      }),
      complete: {
        householdId: async (value) =>
          listKnownHouseholdIds().filter((id) =>
            id.toLowerCase().startsWith(String(value ?? '').toLowerCase())
          )
      }
    }),
    {
      title: 'Household pantry snapshot',
      description: 'JSON snapshot of pantry, prefs, and kitchen run status for a household.',
      mimeType: 'application/json'
    },
    async (uri, variables) => {
      const householdId = String(variables.householdId ?? 'default');
      const snap = pantrySnapshot(householdId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(snap, null, 2)
          }
        ]
      };
    }
  );

  server.registerPrompt(
    'use_up_expiring',
    {
      title: 'Use up expiring pantry',
      description:
        'Steer the agent to call kitchen_run with goal=use_expiring and prioritize soon-to-expire items.',
      argsSchema: {
        householdId: z
          .string()
          .optional()
          .describe('Household id (default demo)'),
        days: z
          .string()
          .optional()
          .describe('Meal plan days as stringified int, default 3')
      }
    },
    async ({ householdId, days }) => {
      const hid = householdId?.trim() || 'demo';
      const n = Math.min(14, Math.max(1, Number(days ?? '3') || 3));
      const snap = pantrySnapshot(hid);
      const expiring = snap.expiringSoon
        .map((p) => `- ${p.name}: ${p.quantity} ${p.unit} (expires ${p.expiresAt})`)
        .join('\n');
      return {
        description: 'Plan meals that use soon-expiring pantry items',
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                `Household ${hid} wants to waste less food.`,
                `Call kitchen_run with householdId="${hid}", days=${n}, goal="use_expiring".`,
                'Then summarize which expiring items were used and what remains on the shop list.',
                '',
                'Expiring soon:',
                expiring || '(none tagged with expiresAt yet — stock pantry first)',
                '',
                'Respect allergies/avoid prefs (hard-gated). Cart stays mock draft only; budgetCents is a hard ceiling.'
              ].join('\n')
            }
          }
        ]
      };
    }
  );

  server.registerPrompt(
    'weekly_kitchen',
    {
      title: 'Weekly kitchen run',
      description: 'Full weekly pantry→meal→shop→cart agent loop for a household.',
      argsSchema: {
        householdId: z
          .string()
          .optional()
          .describe('Household id (default demo)'),
        days: z
          .string()
          .optional()
          .describe('Meal plan days as stringified int, default 3'),
        budgetCents: z
          .string()
          .optional()
          .describe('Optional budget hint in cents')
      }
    },
    async ({ householdId, days, budgetCents }) => {
      const hid = householdId?.trim() || 'demo';
      const n = Math.min(14, Math.max(1, Number(days ?? '3') || 3));
      const budget =
        budgetCents !== undefined && budgetCents !== ''
          ? Number(budgetCents)
          : undefined;
      const budgetLine =
        budget !== undefined && Number.isFinite(budget)
          ? `Pass budgetCents=${Math.trunc(budget)}. Hard budget ceiling on cart_draft.`
          : 'Budget optional — omit budgetCents unless the household set a hard ceiling.';
      return {
        description: 'Run the weekly kitchen agent loop',
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                `Run a weekly kitchen ops loop for household "${hid}".`,
                `Prefer tool kitchen_run with days=${n}, goal="weekly".`,
                budgetLine,
                'After the run, report: mealPlanSource, shop shortfalls, cart totalCents, and mediaCards count.',
                'Do not place real orders; cart_confirm is mock-only.'
              ].join('\n')
            }
          }
        ]
      };
    }
  );
}
