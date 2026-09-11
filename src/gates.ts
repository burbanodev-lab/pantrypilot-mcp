/**
 * Hard gates for allergen conflicts and cart budget ceilings.
 * Prefs already store allergies[] + budgetCents; these helpers enforce them
 * on meal plans, product suggestions, and cart drafts (Impact-friendly fields).
 */

import type { CartLine, HouseholdPrefs, MealSlot } from './state.js';
import type { ProductCard } from './catalog.js';

/** Canonical allergen → ingredient/product token aliases. */
const ALLERGEN_ALIASES: Record<string, string[]> = {
  milk: ['milk', 'dairy', 'yogurt', 'yoghurt', 'cheese', 'butter', 'cream', 'whey', 'lactose'],
  dairy: ['milk', 'dairy', 'yogurt', 'yoghurt', 'cheese', 'butter', 'cream', 'whey', 'lactose'],
  egg: ['egg', 'eggs'],
  eggs: ['egg', 'eggs'],
  peanut: ['peanut', 'peanuts'],
  peanuts: ['peanut', 'peanuts'],
  'tree nut': ['almond', 'walnut', 'cashew', 'pecan', 'hazelnut', 'pistachio', 'nut'],
  nuts: ['almond', 'walnut', 'cashew', 'pecan', 'hazelnut', 'pistachio', 'peanut', 'nut'],
  soy: ['soy', 'soya', 'tofu', 'edamame'],
  wheat: ['wheat', 'flour', 'bread', 'pasta', 'spaghetti', 'noodles'],
  gluten: ['wheat', 'flour', 'bread', 'pasta', 'spaghetti', 'noodles', 'barley', 'rye', 'oats'],
  fish: ['fish', 'salmon', 'tuna', 'cod'],
  shellfish: ['shrimp', 'crab', 'lobster', 'shellfish'],
  sesame: ['sesame', 'tahini'],
  chicken: ['chicken'],
  meat: ['chicken', 'beef', 'pork', 'meat']
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True if haystack mentions an allergen (or one of its aliases). */
export function textConflictsWithAllergen(haystack: string, allergen: string): boolean {
  const key = allergen.trim().toLowerCase();
  if (!key) return false;
  const aliases = ALLERGEN_ALIASES[key] ?? [key];
  const hay = haystack.toLowerCase();
  return aliases.some((a) => {
    const re = new RegExp(`\\b${escapeRegExp(a)}s?\\b`, 'i');
    return re.test(hay);
  });
}

export function normalizeAllergyList(allergies: string[] | undefined): string[] {
  if (!allergies?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of allergies) {
    const t = a.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export type AllergenHit = {
  allergen: string;
  matchedIn: string;
  source: 'ingredient' | 'title' | 'tag' | 'product';
};

export function mealSlotAllergenHits(slot: MealSlot, allergies: string[]): AllergenHit[] {
  const list = normalizeAllergyList(allergies);
  if (!list.length) return [];
  const hits: AllergenHit[] = [];
  for (const allergen of list) {
    if (textConflictsWithAllergen(slot.title, allergen)) {
      hits.push({ allergen, matchedIn: slot.title, source: 'title' });
    }
    for (const tag of slot.tags ?? []) {
      if (textConflictsWithAllergen(tag, allergen)) {
        hits.push({ allergen, matchedIn: tag, source: 'tag' });
      }
    }
    for (const ing of slot.ingredients) {
      if (textConflictsWithAllergen(ing.name, allergen)) {
        hits.push({ allergen, matchedIn: ing.name, source: 'ingredient' });
      }
    }
  }
  return hits;
}

export function productAllergenHits(
  product: Pick<ProductCard, 'title' | 'keywords' | 'category'> & { allergens?: string[] },
  allergies: string[]
): AllergenHit[] {
  const list = normalizeAllergyList(allergies);
  if (!list.length) return [];
  const hits: AllergenHit[] = [];
  const declared = (product.allergens ?? []).map((a) => a.toLowerCase());
  const hay = [product.title, product.category, ...(product.keywords ?? []), ...declared].join(' ');
  for (const allergen of list) {
    if (declared.some((d) => d === allergen || textConflictsWithAllergen(d, allergen))) {
      hits.push({ allergen, matchedIn: allergen, source: 'product' });
      continue;
    }
    if (textConflictsWithAllergen(hay, allergen)) {
      hits.push({ allergen, matchedIn: product.title, source: 'product' });
    }
  }
  return hits;
}

export type AllergenGateResult = {
  ok: boolean;
  code: 'ALLERGEN_OK' | 'ALLERGEN_FILTERED' | 'ALLERGEN_BLOCKED';
  allergies: string[];
  blockedCount: number;
  keptCount: number;
  blocked: Array<{ title?: string; name?: string; hits: AllergenHit[] }>;
  message?: string;
};

/** Filter meal slots that conflict with household allergies. */
export function filterMealPlanByAllergens(
  plan: MealSlot[],
  allergies: string[] | undefined
): { plan: MealSlot[]; gate: AllergenGateResult } {
  const list = normalizeAllergyList(allergies);
  if (!list.length) {
    return {
      plan,
      gate: {
        ok: true,
        code: 'ALLERGEN_OK',
        allergies: [],
        blockedCount: 0,
        keptCount: plan.length,
        blocked: []
      }
    };
  }
  const kept: MealSlot[] = [];
  const blocked: AllergenGateResult['blocked'] = [];
  for (const slot of plan) {
    const hits = mealSlotAllergenHits(slot, list);
    if (hits.length) {
      blocked.push({ title: slot.title, hits });
    } else {
      kept.push(slot);
    }
  }
  const allBlocked = kept.length === 0 && plan.length > 0;
  const filtered = blocked.length > 0;
  return {
    plan: kept,
    gate: {
      ok: !allBlocked,
      code: allBlocked ? 'ALLERGEN_BLOCKED' : filtered ? 'ALLERGEN_FILTERED' : 'ALLERGEN_OK',
      allergies: list,
      blockedCount: blocked.length,
      keptCount: kept.length,
      blocked,
      message: allBlocked
        ? `All ${plan.length} meal slot(s) conflict with allergies: ${list.join(', ')}`
        : filtered
          ? `Filtered ${blocked.length} allergen-conflicting meal slot(s); kept ${kept.length}`
          : undefined
    }
  };
}

/** Filter catalog products that conflict with allergies. */
export function filterProductsByAllergens<T extends ProductCard>(
  products: T[],
  allergies: string[] | undefined
): { products: T[]; gate: AllergenGateResult } {
  const list = normalizeAllergyList(allergies);
  if (!list.length) {
    return {
      products,
      gate: {
        ok: true,
        code: 'ALLERGEN_OK',
        allergies: [],
        blockedCount: 0,
        keptCount: products.length,
        blocked: []
      }
    };
  }
  const kept: T[] = [];
  const blocked: AllergenGateResult['blocked'] = [];
  for (const p of products) {
    const hits = productAllergenHits(p, list);
    if (hits.length) {
      blocked.push({ name: p.title, hits });
    } else {
      kept.push(p);
    }
  }
  const allBlocked = kept.length === 0 && products.length > 0;
  const filtered = blocked.length > 0;
  return {
    products: kept,
    gate: {
      ok: !allBlocked,
      code: allBlocked ? 'ALLERGEN_BLOCKED' : filtered ? 'ALLERGEN_FILTERED' : 'ALLERGEN_OK',
      allergies: list,
      blockedCount: blocked.length,
      keptCount: kept.length,
      blocked,
      message: allBlocked
        ? `All product hits conflict with allergies: ${list.join(', ')}`
        : filtered
          ? `Filtered ${blocked.length} allergen-conflicting product(s); kept ${kept.length}`
          : undefined
    }
  };
}

export type BudgetGateResult = {
  ok: boolean;
  code: 'BUDGET_OK' | 'BUDGET_EXCEEDED' | 'BUDGET_UNSET';
  budgetCents: number | null;
  totalCents: number;
  overByCents: number;
  currency: 'USD';
  message?: string;
};

/** Enforce prefs.budgetCents ceiling on a cart total. */
export function enforceBudgetCeiling(
  totalCents: number,
  prefs: HouseholdPrefs
): BudgetGateResult {
  const budget = prefs.budgetCents;
  if (budget === undefined || budget === null) {
    return {
      ok: true,
      code: 'BUDGET_UNSET',
      budgetCents: null,
      totalCents,
      overByCents: 0,
      currency: 'USD'
    };
  }
  const overBy = Math.max(0, totalCents - budget);
  if (overBy > 0) {
    return {
      ok: false,
      code: 'BUDGET_EXCEEDED',
      budgetCents: budget,
      totalCents,
      overByCents: overBy,
      currency: 'USD',
      message: `Cart total ${totalCents}¢ exceeds budget ${budget}¢ by ${overBy}¢`
    };
  }
  return {
    ok: true,
    code: 'BUDGET_OK',
    budgetCents: budget,
    totalCents,
    overByCents: 0,
    currency: 'USD'
  };
}

/** Drop cart lines until under budget (greedy by line cost desc), for soft trim attempts. */
export function trimCartLinesToBudget(
  lines: CartLine[],
  budgetCents: number
): { lines: CartLine[]; totalCents: number; removed: CartLine[] } {
  const sorted = [...lines].sort((a, b) => b.priceCents * b.quantity - a.priceCents * a.quantity);
  const kept: CartLine[] = [];
  const removed: CartLine[] = [];
  let total = 0;
  // Prefer keeping cheaper lines first so we maximize coverage under budget.
  const byCheap = [...lines].sort((a, b) => a.priceCents * a.quantity - b.priceCents * b.quantity);
  for (const line of byCheap) {
    const add = line.priceCents * line.quantity;
    if (total + add <= budgetCents) {
      kept.push(line);
      total += add;
    } else {
      removed.push(line);
    }
  }
  void sorted;
  return { lines: kept, totalCents: total, removed };
}
