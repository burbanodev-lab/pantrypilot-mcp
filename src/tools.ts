import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { matchProductForIngredient, searchCatalog } from './catalog.js';
import {
  bindSession,
  getOrCreateHousehold,
  pantryKey,
  recallSession,
  resolveHouseholdId,
  serializePantry,
  touch,
  type MealSlot,
  type ShopLine
} from './state.js';

function jsonContent(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
  };
}

const householdIdField = z
  .string()
  .optional()
  .describe('Household key. Defaults to session-bound household or "default".');

/** Deterministic meal-plan stub from prefs + pantry presence. */
function buildMealPlan(days: number, servings: number, diet: string[]): MealSlot[] {
  const vegetarian = diet.some(d => /veg/i.test(d));
  const templates: Array<Omit<MealSlot, 'day'>> = vegetarian
    ? [
        {
          meal: 'breakfast',
          title: 'Oatmeal with banana',
          ingredients: [
            { name: 'oats', quantity: 0.5 * servings, unit: 'cup' },
            { name: 'banana', quantity: 1 * servings, unit: 'count' },
            { name: 'milk', quantity: 1 * servings, unit: 'cup' }
          ]
        },
        {
          meal: 'lunch',
          title: 'Tomato pasta',
          ingredients: [
            { name: 'pasta', quantity: 4 * servings, unit: 'oz' },
            { name: 'tomatoes', quantity: 1 * servings, unit: 'can' },
            { name: 'olive oil', quantity: 1 * servings, unit: 'tbsp' }
          ]
        },
        {
          meal: 'dinner',
          title: 'Rice bowl with yogurt',
          ingredients: [
            { name: 'rice', quantity: 1 * servings, unit: 'cup' },
            { name: 'yogurt', quantity: 0.5 * servings, unit: 'cup' },
            { name: 'olive oil', quantity: 1 * servings, unit: 'tbsp' }
          ]
        }
      ]
    : [
        {
          meal: 'breakfast',
          title: 'Eggs and toast oats side',
          ingredients: [
            { name: 'eggs', quantity: 2 * servings, unit: 'count' },
            { name: 'oats', quantity: 0.25 * servings, unit: 'cup' },
            { name: 'milk', quantity: 0.5 * servings, unit: 'cup' }
          ]
        },
        {
          meal: 'lunch',
          title: 'Chicken rice bowl',
          ingredients: [
            { name: 'chicken', quantity: 0.4 * servings, unit: 'lb' },
            { name: 'rice', quantity: 1 * servings, unit: 'cup' },
            { name: 'olive oil', quantity: 1 * servings, unit: 'tbsp' }
          ]
        },
        {
          meal: 'dinner',
          title: 'Spaghetti with chicken',
          ingredients: [
            { name: 'pasta', quantity: 4 * servings, unit: 'oz' },
            { name: 'tomatoes', quantity: 1 * servings, unit: 'can' },
            { name: 'chicken', quantity: 0.3 * servings, unit: 'lb' }
          ]
        }
      ];

  const out: MealSlot[] = [];
  const start = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const day = d.toISOString().slice(0, 10);
    for (const t of templates) {
      out.push({ day, ...t });
    }
  }
  return out;
}

function buildShopList(h: ReturnType<typeof getOrCreateHousehold>): ShopLine[] {
  const needed = new Map<string, ShopLine>();
  for (const slot of h.mealPlan) {
    for (const ing of slot.ingredients) {
      const key = pantryKey(ing.name, ing.unit);
      const have = h.pantry.get(key)?.quantity ?? 0;
      const shortfall = Math.max(0, ing.quantity - have);
      if (shortfall <= 0) continue;
      const existing = needed.get(key);
      if (existing) {
        existing.quantity += shortfall;
      } else {
        needed.set(key, {
          name: ing.name,
          quantity: shortfall,
          unit: ing.unit,
          reason: `Needed for ${slot.title} on ${slot.day}`
        });
      }
    }
  }
  return [...needed.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    'pantry_upsert',
    {
      description: 'Add or update pantry items for a household (in-memory).',
      inputSchema: {
        householdId: householdIdField,
        items: z
          .array(
            z.object({
              name: z.string().describe('Ingredient name'),
              quantity: z.number().describe('Quantity on hand'),
              unit: z.string().describe('Unit, e.g. cup, lb, count'),
              sku: z.string().optional(),
              expiresAt: z.string().optional().describe('ISO date when item expires')
            })
          )
          .min(1)
      }
    },
    async ({ householdId, items }, extra) => {
      const hid = resolveHouseholdId(householdId, extra.sessionId);
      const h = getOrCreateHousehold(hid);
      bindSession(extra.sessionId, hid);
      const updated = [];
      for (const item of items) {
        const key = pantryKey(item.name, item.unit);
        const row = {
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          expiresAt: item.expiresAt,
          updatedAt: new Date().toISOString()
        };
        h.pantry.set(key, row);
        updated.push(row);
      }
      touch(h);
      return jsonContent({ householdId: hid, updated, pantry: serializePantry(h) });
    }
  );

  server.registerTool(
    'pantry_query',
    {
      description: 'Query pantry contents, optionally filter by name substring.',
      inputSchema: {
        householdId: householdIdField,
        q: z.string().optional().describe('Optional name filter')
      }
    },
    async ({ householdId, q }, extra) => {
      const hid = resolveHouseholdId(householdId, extra.sessionId);
      const h = getOrCreateHousehold(hid);
      bindSession(extra.sessionId, hid);
      let items = serializePantry(h);
      if (q?.trim()) {
        const needle = q.trim().toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(needle));
      }
      return jsonContent({ householdId: hid, count: items.length, items });
    }
  );

  server.registerTool(
    'prefs_set',
    {
      description: 'Set dietary and household meal preferences.',
      inputSchema: {
        householdId: householdIdField,
        diet: z.array(z.string()).optional(),
        allergies: z.array(z.string()).optional(),
        avoid: z.array(z.string()).optional(),
        servings: z.number().int().positive().optional(),
        cuisineBias: z.array(z.string()).optional(),
        budgetCents: z.number().int().nonnegative().optional()
      }
    },
    async (args, extra) => {
      const hid = resolveHouseholdId(args.householdId, extra.sessionId);
      const h = getOrCreateHousehold(hid);
      bindSession(extra.sessionId, hid);
      h.prefs = {
        ...h.prefs,
        ...(args.diet !== undefined ? { diet: args.diet } : {}),
        ...(args.allergies !== undefined ? { allergies: args.allergies } : {}),
        ...(args.avoid !== undefined ? { avoid: args.avoid } : {}),
        ...(args.servings !== undefined ? { servings: args.servings } : {}),
        ...(args.cuisineBias !== undefined ? { cuisineBias: args.cuisineBias } : {}),
        ...(args.budgetCents !== undefined ? { budgetCents: args.budgetCents } : {})
      };
      touch(h);
      return jsonContent({ householdId: hid, prefs: h.prefs });
    }
  );

  server.registerTool(
    'prefs_get',
    {
      description: 'Get household dietary preferences.',
      inputSchema: { householdId: householdIdField }
    },
    async ({ householdId }, extra) => {
      const hid = resolveHouseholdId(householdId, extra.sessionId);
      const h = getOrCreateHousehold(hid);
      bindSession(extra.sessionId, hid);
      return jsonContent({ householdId: hid, prefs: h.prefs });
    }
  );

  server.registerTool(
    'meal_plan',
    {
      description:
        'Generate a deterministic multi-day meal plan stub from prefs (no LLM). Respects vegetarian diet tags.',
      inputSchema: {
        householdId: householdIdField,
        days: z.number().int().min(1).max(14).optional().describe('Number of days (default 3)')
      }
    },
    async ({ householdId, days }, extra) => {
      const hid = resolveHouseholdId(householdId, extra.sessionId);
      const h = getOrCreateHousehold(hid);
      bindSession(extra.sessionId, hid);
      const plan = buildMealPlan(days ?? 3, h.prefs.servings ?? 2, h.prefs.diet ?? []);
      h.mealPlan = plan;
      touch(h);
      return jsonContent({ householdId: hid, days: days ?? 3, mealPlan: plan });
    }
  );

  server.registerTool(
    'shop_list_build',
    {
      description: 'Build a shopping list from meal-plan shortfalls vs pantry stock.',
      inputSchema: { householdId: householdIdField }
    },
    async ({ householdId }, extra) => {
      const hid = resolveHouseholdId(householdId, extra.sessionId);
      const h = getOrCreateHousehold(hid);
      bindSession(extra.sessionId, hid);
      if (h.mealPlan.length === 0) {
        h.mealPlan = buildMealPlan(3, h.prefs.servings ?? 2, h.prefs.diet ?? []);
      }
      h.shopList = buildShopList(h);
      touch(h);
      return jsonContent({ householdId: hid, shopList: h.shopList });
    }
  );

  server.registerTool(
    'product_search',
    {
      description:
        'Search the mock product catalog. Returns card fields (asin, title, price, image, detail URL) suitable for Alexa shopping cards.',
      inputSchema: {
        query: z.string().describe('Search query'),
        limit: z.number().int().min(1).max(20).optional()
      }
    },
    async ({ query, limit }) => {
      const products = searchCatalog(query, limit ?? 5);
      return jsonContent({
        query,
        count: products.length,
        products: products.map(p => ({
          asin: p.asin,
          title: p.title,
          brand: p.brand,
          category: p.category,
          priceCents: p.priceCents,
          currency: p.currency,
          imageUrl: p.imageUrl,
          detailPageUrl: p.detailPageUrl,
          rating: p.rating,
          reviewCount: p.reviewCount,
          primeEligible: p.primeEligible
        }))
      });
    }
  );

  server.registerTool(
    'cart_draft',
    {
      description:
        'Draft a mock cart from the current shopping list (or explicit lines). No Amazon API — local stub only.',
      inputSchema: {
        householdId: householdIdField,
        lines: z
          .array(
            z.object({
              name: z.string(),
              quantity: z.number().positive().optional()
            })
          )
          .optional()
          .describe('Optional explicit lines; defaults to shop list')
      }
    },
    async ({ householdId, lines }, extra) => {
      const hid = resolveHouseholdId(householdId, extra.sessionId);
      const h = getOrCreateHousehold(hid);
      bindSession(extra.sessionId, hid);
      const source =
        lines?.map(l => ({ name: l.name, quantity: l.quantity ?? 1 })) ??
        h.shopList.map(s => ({ name: s.name, quantity: Math.max(1, Math.ceil(s.quantity)) }));

      const cartLines = [];
      for (const line of source) {
        const product = matchProductForIngredient(line.name);
        if (!product) continue;
        cartLines.push({
          asin: product.asin,
          title: product.title,
          quantity: line.quantity,
          priceCents: product.priceCents,
          imageUrl: product.imageUrl,
          detailPageUrl: product.detailPageUrl
        });
      }
      const totalCents = cartLines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
      h.cart = {
        cartId: `cart_${randomUUID().slice(0, 8)}`,
        status: 'draft',
        lines: cartLines,
        totalCents,
        currency: 'USD',
        createdAt: new Date().toISOString()
      };
      touch(h);
      return jsonContent({ householdId: hid, cart: h.cart });
    }
  );

  server.registerTool(
    'cart_confirm',
    {
      description:
        'Confirm the current draft cart (mock). Does not call Amazon; returns a confirmation receipt for demo flows.',
      inputSchema: {
        householdId: householdIdField,
        cartId: z.string().optional().describe('Optional cart id to confirm')
      }
    },
    async ({ householdId, cartId }, extra) => {
      const hid = resolveHouseholdId(householdId, extra.sessionId);
      const h = getOrCreateHousehold(hid);
      bindSession(extra.sessionId, hid);
      if (!h.cart) {
        return jsonContent({
          ok: false,
          error: 'No cart draft found. Call cart_draft first.',
          householdId: hid
        });
      }
      if (cartId && h.cart.cartId !== cartId) {
        return jsonContent({
          ok: false,
          error: `Cart id mismatch: expected ${h.cart.cartId}`,
          householdId: hid
        });
      }
      h.cart.status = 'confirmed';
      h.cart.confirmedAt = new Date().toISOString();
      h.notes.push(`Cart ${h.cart.cartId} confirmed at ${h.cart.confirmedAt}`);
      touch(h);
      return jsonContent({
        ok: true,
        householdId: hid,
        receipt: {
          cartId: h.cart.cartId,
          status: h.cart.status,
          totalCents: h.cart.totalCents,
          currency: h.cart.currency,
          lineCount: h.cart.lines.length,
          confirmedAt: h.cart.confirmedAt,
          note: 'Mock confirmation — no AWS / Amazon order placed.'
        }
      });
    }
  );

  server.registerTool(
    'session_recall',
    {
      description:
        'Recall session/household context: prefs summary, pantry count, meal plan days, cart status.',
      inputSchema: {
        householdId: householdIdField
      }
    },
    async ({ householdId }, extra) => {
      const snapshot = recallSession(extra.sessionId, householdId);
      return jsonContent(snapshot);
    }
  );
}
