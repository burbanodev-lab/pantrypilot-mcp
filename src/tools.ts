import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { matchProductForIngredient, searchCatalog, toProductMediaCard } from './catalog.js';
import { generateMealPlanWithBedrock, isBedrockConfigured } from './bedrock.js';
import {
  enforceBudgetCeiling,
  filterMealPlanByAllergens,
  filterProductsByAllergens,
  productAllergenHits
} from './gates.js';
import { buildMealPlanStub } from './meals.js';
import { enrichFromOpenFoodFacts } from './openfoodfacts.js';
import {
  bindSession,
  getOrCreateHousehold,
  pantryKey,
  recallSession,
  resolveHouseholdId,
  serializePantry,
  touch,
  type CartLine,
  type HouseholdState,
  type MealSlot,
  type MediaCard,
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

function buildShopList(h: HouseholdState): ShopLine[] {
  // Aggregate total required per pantry key across all meal slots first,
  // then subtract pantry once. Per-slot shortfall summation would reuse
  // the full pantry stock for every meal and under-count the shop list.
  type Agg = { name: string; unit: string; totalRequired: number; reasons: string[] };
  const required = new Map<string, Agg>();
  for (const slot of h.mealPlan) {
    for (const ing of slot.ingredients) {
      const key = pantryKey(ing.name, ing.unit);
      const reason = `Needed for ${slot.title} on ${slot.day}`;
      const existing = required.get(key);
      if (existing) {
        existing.totalRequired += ing.quantity;
        if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      } else {
        required.set(key, {
          name: ing.name,
          unit: ing.unit,
          totalRequired: ing.quantity,
          reasons: [reason]
        });
      }
    }
  }

  const needed: ShopLine[] = [];
  for (const [key, agg] of required) {
    const have = h.pantry.get(key)?.quantity ?? 0;
    const shopQty = Math.max(0, agg.totalRequired - have);
    if (shopQty <= 0) continue;
    needed.push({
      name: agg.name,
      quantity: shopQty,
      unit: agg.unit,
      reason: agg.reasons.join('; ')
    });
  }
  return needed.sort((a, b) => a.name.localeCompare(b.name));
}

async function resolveMealPlan(
  days: number,
  h: HouseholdState
): Promise<{ plan: MealSlot[]; source: 'bedrock' | 'stub'; bedrockError?: string }> {
  const servings = h.prefs.servings ?? 2;
  const diet = h.prefs.diet ?? [];

  const allergies = h.prefs.allergies ?? [];
  if (!isBedrockConfigured()) {
    return { plan: buildMealPlanStub(days, servings, diet, allergies), source: 'stub' };
  }

  try {
    const plan = await generateMealPlanWithBedrock({
      days,
      servings,
      prefs: h.prefs,
      pantry: serializePantry(h)
    });
    return { plan, source: 'bedrock' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[pantrypilot] Bedrock meal_plan failed; using stub:', message);
    return {
      plan: buildMealPlanStub(days, servings, diet, allergies),
      source: 'stub',
      bedrockError: message
    };
  }
}

function draftCartFromShopList(h: HouseholdState): {
  cart: NonNullable<HouseholdState['cart']>;
  mediaCards: MediaCard[];
  allergenBlocked: Array<{ name: string; allergenHits: ReturnType<typeof productAllergenHits> }>;
} {
  const source = h.shopList.map(s => ({
    name: s.name,
    quantity: Math.max(1, Math.ceil(s.quantity))
  }));
  const allergies = h.prefs.allergies ?? [];
  const allergenBlocked: Array<{
    name: string;
    allergenHits: ReturnType<typeof productAllergenHits>;
  }> = [];

  const cartLines: CartLine[] = [];
  for (const line of source) {
    const product = matchProductForIngredient(line.name);
    if (!product) continue;
    const hits = productAllergenHits(product, allergies);
    if (hits.length) {
      allergenBlocked.push({ name: product.title, allergenHits: hits });
      continue;
    }
    const mediaCard = toProductMediaCard(product, line.quantity);
    cartLines.push({
      asin: product.asin,
      title: product.title,
      quantity: line.quantity,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
      detailPageUrl: product.detailPageUrl,
      mediaCard
    });
  }
  const totalCents = cartLines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
  const cart = {
    cartId: `cart_${randomUUID().slice(0, 8)}`,
    status: 'draft' as const,
    lines: cartLines,
    totalCents,
    currency: 'USD' as const,
    createdAt: new Date().toISOString()
  };
  return {
    cart,
    mediaCards: cartLines.map(l => l.mediaCard!).filter(Boolean),
    allergenBlocked
  };
}

type KitchenStep = {
  tool: string;
  ok: boolean;
  ms: number;
  detail?: string;
  error?: string;
};

export function registerTools(server: McpServer): void {
  server.registerTool(
    'pantry_upsert',
    {
      description:
        'Add or update pantry items for a household (persisted to SQLite when DATABASE_PATH is available).',
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
        'Generate a multi-day meal plan. Uses Amazon Bedrock Converse when AWS_REGION and BEDROCK_MODEL_ID are set (plus standard AWS credentials); otherwise a deterministic stub. Each slot includes description, tags, estimatedMinutes, and mediaCard.',
      inputSchema: {
        householdId: householdIdField,
        days: z.number().int().min(1).max(14).optional().describe('Number of days (default 3)')
      }
    },
    async ({ householdId, days }, extra) => {
      const hid = resolveHouseholdId(householdId, extra.sessionId);
      const h = getOrCreateHousehold(hid);
      bindSession(extra.sessionId, hid);
      const n = days ?? 3;
      const { plan: rawPlan, source, bedrockError } = await resolveMealPlan(n, h);
      const { plan, gate: allergenGate } = filterMealPlanByAllergens(
        rawPlan,
        h.prefs.allergies
      );
      if (allergenGate.code === 'ALLERGEN_BLOCKED') {
        return jsonContent({
          ok: false,
          error: allergenGate.message,
          code: allergenGate.code,
          householdId: hid,
          days: n,
          source,
          bedrockConfigured: isBedrockConfigured(),
          ...(bedrockError ? { bedrockError } : {}),
          allergenGate,
          mealPlan: [],
          mediaCards: []
        });
      }
      h.mealPlan = plan;
      touch(h);
      return jsonContent({
        ok: true,
        householdId: hid,
        days: n,
        source,
        bedrockConfigured: isBedrockConfigured(),
        ...(bedrockError ? { bedrockError } : {}),
        allergenGate,
        mealPlan: plan,
        mediaCards: plan.map(s => s.mediaCard).filter(Boolean)
      });
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
        h.mealPlan = buildMealPlanStub(
          3,
          h.prefs.servings ?? 2,
          h.prefs.diet ?? [],
          h.prefs.allergies ?? []
        );
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
        'Search the mock product catalog. Hard-filters products that conflict with household allergies when householdId is provided. Optionally enriches the top hit via Open Food Facts (offline fallback). Returns card fields plus mediaCard payloads.',
      inputSchema: {
        query: z.string().describe('Search query'),
        limit: z.number().int().min(1).max(20).optional(),
        householdId: householdIdField,
        enrich: z
          .boolean()
          .optional()
          .describe('If true, enrich top product via Open Food Facts (offline fallback)')
      }
    },
    async ({ query, limit, householdId, enrich }, extra) => {
      const hid = resolveHouseholdId(householdId, extra.sessionId);
      const h = getOrCreateHousehold(hid);
      bindSession(extra.sessionId, hid);
      const raw = searchCatalog(query, limit ?? 5);
      const { products, gate: allergenGate } = filterProductsByAllergens(
        raw,
        h.prefs.allergies
      );
      let offEnrichment = null;
      if (enrich && products[0]) {
        offEnrichment = await enrichFromOpenFoodFacts(products[0].title);
      } else if (enrich && !products[0] && raw[0]) {
        // Still allow offline enrichment of blocked top hit for transparency
        offEnrichment = await enrichFromOpenFoodFacts(raw[0].title);
      }
      return jsonContent({
        ok: allergenGate.code !== 'ALLERGEN_BLOCKED',
        query,
        householdId: hid,
        count: products.length,
        allergenGate,
        ...(offEnrichment ? { openFoodFacts: offEnrichment } : {}),
        products: products.map(p => ({
          asin: p.asin,
          title: p.title,
          brand: p.brand,
          category: p.category,
          priceCents: p.priceCents,
          currency: p.currency,
          allergens: p.allergens ?? [],
          imageUrl: p.imageUrl,
          detailPageUrl: p.detailPageUrl,
          rating: p.rating,
          reviewCount: p.reviewCount,
          primeEligible: p.primeEligible,
          mediaCard: toProductMediaCard(p)
        })),
        mediaCards: products.map(toProductMediaCard)
      });
    }
  );

  server.registerTool(
    'cart_draft',
    {
      description:
        'Draft a mock cart from the current shopping list (or explicit lines). Hard-filters allergen-conflicting products and rejects drafts that exceed prefs.budgetCents. No Amazon API — local stub only.',
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
      const allergies = h.prefs.allergies ?? [];
      let cartLines: CartLine[] = [];
      let mediaCards: MediaCard[] = [];
      const allergenBlocked: Array<{
        name: string;
        allergenHits: ReturnType<typeof productAllergenHits>;
      }> = [];

      if (lines?.length) {
        for (const line of lines) {
          const qty = line.quantity ?? 1;
          const product = matchProductForIngredient(line.name);
          if (!product) continue;
          const hits = productAllergenHits(product, allergies);
          if (hits.length) {
            allergenBlocked.push({ name: product.title, allergenHits: hits });
            continue;
          }
          const mediaCard = toProductMediaCard(product, qty);
          cartLines.push({
            asin: product.asin,
            title: product.title,
            quantity: qty,
            priceCents: product.priceCents,
            imageUrl: product.imageUrl,
            detailPageUrl: product.detailPageUrl,
            mediaCard
          });
        }
        mediaCards = cartLines.map(l => l.mediaCard!).filter(Boolean);
      } else {
        const drafted = draftCartFromShopList(h);
        cartLines = drafted.cart.lines;
        mediaCards = drafted.mediaCards;
        allergenBlocked.push(...drafted.allergenBlocked);
      }

      const totalCents = cartLines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
      const budgetGate = enforceBudgetCeiling(totalCents, h.prefs);
      if (!budgetGate.ok) {
        return jsonContent({
          ok: false,
          error: budgetGate.message,
          code: budgetGate.code,
          householdId: hid,
          budgetGate,
          allergenBlocked,
          cart: null,
          mediaCards: []
        });
      }

      h.cart = {
        cartId: `cart_${randomUUID().slice(0, 8)}`,
        status: 'draft',
        lines: cartLines,
        totalCents,
        currency: 'USD',
        createdAt: new Date().toISOString()
      };
      touch(h);
      return jsonContent({
        ok: true,
        householdId: hid,
        budgetGate,
        allergenBlocked,
        cart: h.cart,
        mediaCards
      });
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
        },
        mediaCards: h.cart.lines.map(l => l.mediaCard).filter(Boolean)
      });
    }
  );

  server.registerTool(
    'session_recall',
    {
      description:
        'Recall session/household context: prefs summary, pantry count, meal plan days, cart status. Survives process restart when SQLite is enabled.',
      inputSchema: {
        householdId: householdIdField
      }
    },
    async ({ householdId }, extra) => {
      const snapshot = recallSession(extra.sessionId, householdId);
      return jsonContent(snapshot);
    }
  );

  server.registerTool(
    'kitchen_run',
    {
      description:
        'Agent loop: pantry_query → meal_plan → shop_list_build → product_search → cart_draft. Hard allergen filter on meals/products and budget ceiling on cart draft. Returns step log, gates, cart, mediaCards.',
      inputSchema: {
        householdId: householdIdField,
        days: z
          .number()
          .int()
          .min(1)
          .max(14)
          .optional()
          .describe('Meal plan days (default 3)'),
        budgetCents: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe('Optional budget ceiling (cents) stored on prefs and enforced on cart_draft'),
        goal: z
          .enum(['weekly', 'use_expiring'])
          .optional()
          .describe('Planning goal (default weekly)')
      }
    },
    async ({ householdId, days, budgetCents, goal }, extra) => {
      const started = Date.now();
      const steps: KitchenStep[] = [];
      const hid = resolveHouseholdId(householdId, extra.sessionId);
      const h = getOrCreateHousehold(hid);
      bindSession(extra.sessionId, hid);

      if (budgetCents !== undefined) {
        h.prefs = { ...h.prefs, budgetCents };
        touch(h);
      }

      const n = days ?? 3;
      const runGoal = goal ?? 'weekly';

      // 1) pantry_query
      {
        const t0 = Date.now();
        try {
          const pantry = serializePantry(h);
          steps.push({
            tool: 'pantry_query',
            ok: true,
            ms: Date.now() - t0,
            detail: `count=${pantry.length}`
          });
        } catch (err) {
          steps.push({
            tool: 'pantry_query',
            ok: false,
            ms: Date.now() - t0,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      // 2) meal_plan (+ allergen hard gate)
      let mealSource: 'bedrock' | 'stub' = 'stub';
      let bedrockError: string | undefined;
      let allergenGate: ReturnType<typeof filterMealPlanByAllergens>['gate'] | null = null;
      {
        const t0 = Date.now();
        try {
          const resolved = await resolveMealPlan(n, h);
          mealSource = resolved.source;
          bedrockError = resolved.bedrockError;
          // use_expiring: sort slots that mention soon-expiring pantry names first (light heuristic)
          let plan = resolved.plan;
          if (runGoal === 'use_expiring') {
            const expiring = serializePantry(h)
              .filter(p => p.expiresAt)
              .sort((a, b) => String(a.expiresAt).localeCompare(String(b.expiresAt)))
              .slice(0, 5)
              .map(p => p.name.toLowerCase());
            if (expiring.length) {
              plan = [...plan].sort((a, b) => {
                const score = (s: MealSlot) =>
                  s.ingredients.some(i => expiring.some(e => i.name.toLowerCase().includes(e)))
                    ? 0
                    : 1;
                return score(a) - score(b);
              });
            }
          }
          const filtered = filterMealPlanByAllergens(plan, h.prefs.allergies);
          allergenGate = filtered.gate;
          plan = filtered.plan;
          if (allergenGate.code === 'ALLERGEN_BLOCKED') {
            h.mealPlan = [];
            touch(h);
            steps.push({
              tool: 'meal_plan',
              ok: false,
              ms: Date.now() - t0,
              error: allergenGate.message ?? 'ALLERGEN_BLOCKED'
            });
          } else {
            h.mealPlan = plan;
            touch(h);
            steps.push({
              tool: 'meal_plan',
              ok: true,
              ms: Date.now() - t0,
              detail: `days=${n} source=${mealSource} slots=${plan.length} goal=${runGoal} allergen=${allergenGate.code}`
            });
          }
        } catch (err) {
          steps.push({
            tool: 'meal_plan',
            ok: false,
            ms: Date.now() - t0,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      // 3) shop_list_build
      {
        const t0 = Date.now();
        try {
          if (h.mealPlan.length === 0) {
            h.mealPlan = buildMealPlanStub(
              n,
              h.prefs.servings ?? 2,
              h.prefs.diet ?? [],
              h.prefs.allergies ?? []
            );
          }
          h.shopList = buildShopList(h);
          touch(h);
          steps.push({
            tool: 'shop_list_build',
            ok: true,
            ms: Date.now() - t0,
            detail: `lines=${h.shopList.length}`
          });
        } catch (err) {
          steps.push({
            tool: 'shop_list_build',
            ok: false,
            ms: Date.now() - t0,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      // 4) product_search for top shortfalls (allergen-filtered)
      const productHits: { query: string; count: number; blocked: number }[] = [];
      {
        const t0 = Date.now();
        try {
          const queries = h.shopList.slice(0, 5).map(s => s.name);
          for (const q of queries) {
            const raw = searchCatalog(q, 3);
            const { products, gate } = filterProductsByAllergens(raw, h.prefs.allergies);
            productHits.push({
              query: q,
              count: products.length,
              blocked: gate.blockedCount
            });
          }
          steps.push({
            tool: 'product_search',
            ok: true,
            ms: Date.now() - t0,
            detail: `queries=${queries.length} hits=${productHits.reduce((a, b) => a + b.count, 0)} blocked=${productHits.reduce((a, b) => a + b.blocked, 0)}`
          });
        } catch (err) {
          steps.push({
            tool: 'product_search',
            ok: false,
            ms: Date.now() - t0,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      // 5) cart_draft (+ budget hard gate)
      let mediaCards: MediaCard[] = [];
      let budgetGate: ReturnType<typeof enforceBudgetCeiling> | null = null;
      {
        const t0 = Date.now();
        try {
          const drafted = draftCartFromShopList(h);
          budgetGate = enforceBudgetCeiling(drafted.cart.totalCents, h.prefs);
          if (!budgetGate.ok) {
            mediaCards = [];
            steps.push({
              tool: 'cart_draft',
              ok: false,
              ms: Date.now() - t0,
              error: budgetGate.message ?? 'BUDGET_EXCEEDED'
            });
          } else {
            h.cart = drafted.cart;
            mediaCards = drafted.mediaCards;
            touch(h);
            steps.push({
              tool: 'cart_draft',
              ok: true,
              ms: Date.now() - t0,
              detail: `cartId=${h.cart.cartId} lines=${h.cart.lines.length} totalCents=${h.cart.totalCents} budget=${budgetGate.code}`
            });
          }
        } catch (err) {
          steps.push({
            tool: 'cart_draft',
            ok: false,
            ms: Date.now() - t0,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      const ok = steps.every(s => s.ok);
      h.notes.push(
        `kitchen_run ${runGoal} ${ok ? 'ok' : 'partial'} at ${new Date().toISOString()} (${Date.now() - started}ms)`
      );
      touch(h);

      return jsonContent({
        ok,
        householdId: hid,
        goal: runGoal,
        days: n,
        mealPlanSource: mealSource,
        bedrockConfigured: isBedrockConfigured(),
        ...(bedrockError ? { bedrockError } : {}),
        ...(allergenGate ? { allergenGate } : {}),
        ...(budgetGate ? { budgetGate } : {}),
        steps,
        totalMs: Date.now() - started,
        pantryCount: h.pantry.size,
        mealPlan: h.mealPlan,
        shopList: h.shopList,
        productHits,
        cart: ok ? (h.cart ?? null) : (budgetGate && !budgetGate.ok ? null : h.cart ?? null),
        mediaCards: [
          ...h.mealPlan.map(s => s.mediaCard).filter(Boolean),
          ...mediaCards
        ],
        prefs: h.prefs
      });
    }
  );
}
