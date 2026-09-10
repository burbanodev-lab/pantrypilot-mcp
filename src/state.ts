/**
 * In-memory household state keyed by householdId.
 * MCP session IDs can be mapped to households for session_recall.
 */

export type PantryItem = {
  sku?: string;
  name: string;
  quantity: number;
  unit: string;
  expiresAt?: string;
  updatedAt: string;
};

export type HouseholdPrefs = {
  diet?: string[];
  allergies?: string[];
  avoid?: string[];
  servings?: number;
  cuisineBias?: string[];
  budgetCents?: number;
};

/** Alexa-friendly media / shopping card payload. */
export type MediaCard = {
  title: string;
  subtitle?: string;
  text?: string;
  imageUrl?: string;
  detailPageUrl?: string;
};

export type MealIngredient = {
  name: string;
  quantity: number;
  unit: string;
};

export type MealSlot = {
  day: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  description?: string;
  tags?: string[];
  estimatedMinutes?: number;
  ingredients: MealIngredient[];
  /** Structured card for Alexa+ companion UI. */
  mediaCard?: MediaCard;
};

export type ShopLine = {
  name: string;
  quantity: number;
  unit: string;
  reason: string;
};

export type CartLine = {
  asin: string;
  title: string;
  quantity: number;
  priceCents: number;
  imageUrl?: string;
  detailPageUrl?: string;
  /** Structured shopping / media card for Alexa+ UI. */
  mediaCard?: MediaCard;
};

export type CartDraft = {
  cartId: string;
  status: 'draft' | 'confirmed';
  lines: CartLine[];
  totalCents: number;
  currency: 'USD';
  createdAt: string;
  confirmedAt?: string;
};

export type HouseholdState = {
  householdId: string;
  pantry: Map<string, PantryItem>;
  prefs: HouseholdPrefs;
  mealPlan: MealSlot[];
  shopList: ShopLine[];
  cart?: CartDraft;
  notes: string[];
  updatedAt: string;
};

const households = new Map<string, HouseholdState>();
const sessionToHousehold = new Map<string, string>();

function nowIso(): string {
  return new Date().toISOString();
}

export function pantryKey(name: string, unit: string): string {
  return `${name.trim().toLowerCase()}::${unit.trim().toLowerCase()}`;
}

export function getOrCreateHousehold(householdId: string): HouseholdState {
  const id = householdId.trim() || 'default';
  let h = households.get(id);
  if (!h) {
    h = {
      householdId: id,
      pantry: new Map(),
      prefs: { diet: [], allergies: [], avoid: [], servings: 2 },
      mealPlan: [],
      shopList: [],
      notes: [],
      updatedAt: nowIso()
    };
    households.set(id, h);
  }
  return h;
}

export function bindSession(sessionId: string | undefined, householdId: string): void {
  if (sessionId) {
    sessionToHousehold.set(sessionId, householdId);
  }
}

export function resolveHouseholdId(
  householdId: string | undefined,
  sessionId: string | undefined
): string {
  if (householdId?.trim()) return householdId.trim();
  if (sessionId && sessionToHousehold.has(sessionId)) {
    return sessionToHousehold.get(sessionId)!;
  }
  return 'default';
}

export function recallSession(sessionId: string | undefined, householdId?: string) {
  const hid = resolveHouseholdId(householdId, sessionId);
  const h = getOrCreateHousehold(hid);
  if (sessionId) bindSession(sessionId, hid);
  return {
    sessionId: sessionId ?? null,
    householdId: h.householdId,
    pantryCount: h.pantry.size,
    prefs: h.prefs,
    mealPlanDays: [...new Set(h.mealPlan.map(m => m.day))],
    shopListCount: h.shopList.length,
    cartStatus: h.cart?.status ?? null,
    notes: h.notes.slice(-5),
    updatedAt: h.updatedAt
  };
}

export function touch(h: HouseholdState): void {
  h.updatedAt = nowIso();
}

export function serializePantry(h: HouseholdState): PantryItem[] {
  return [...h.pantry.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Test helper: wipe all in-memory state. */
export function __resetStateForTests(): void {
  households.clear();
  sessionToHousehold.clear();
}
