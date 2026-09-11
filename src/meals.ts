/**
 * Deterministic meal-plan stub + structured meal / Alexa media-card helpers.
 * Used when Bedrock is not configured (or as fallback after a Bedrock error).
 */
import type { MealSlot, MealIngredient, MediaCard } from './state.js';
import { mealSlotAllergenHits, normalizeAllergyList } from './gates.js';

const PLACEHOLDER_MEAL_IMAGE =
  'https://example.com/img/meal-placeholder.png';

export function mealMediaCard(
  title: string,
  opts: { subtitle?: string; text?: string; imageUrl?: string; detailPageUrl?: string } = {}
): MediaCard {
  return {
    title,
    subtitle: opts.subtitle,
    text: opts.text,
    imageUrl: opts.imageUrl ?? PLACEHOLDER_MEAL_IMAGE,
    detailPageUrl: opts.detailPageUrl
  };
}

function enrichSlot(slot: Omit<MealSlot, 'mediaCard'> & { mediaCard?: MediaCard }): MealSlot {
  const ingredientSummary = slot.ingredients.map(i => i.name).join(', ');
  return {
    ...slot,
    description:
      slot.description ??
      `${slot.title} — ${slot.meal} featuring ${ingredientSummary}.`,
    tags: slot.tags ?? [slot.meal, ...slot.ingredients.slice(0, 2).map(i => i.name)],
    estimatedMinutes: slot.estimatedMinutes ?? (slot.meal === 'breakfast' ? 15 : 30),
    mediaCard:
      slot.mediaCard ??
      mealMediaCard(slot.title, {
        subtitle: `${slot.day} · ${slot.meal}`,
        text: ingredientSummary,
        imageUrl: PLACEHOLDER_MEAL_IMAGE
      })
  };
}

/** Deterministic meal-plan stub from prefs + pantry presence. */
export function buildMealPlanStub(
  days: number,
  servings: number,
  diet: string[],
  allergies: string[] = []
): MealSlot[] {
  const vegetarian = diet.some(d => /veg/i.test(d));
  const allergyList = normalizeAllergyList(allergies);
  const templates: Array<
    Omit<MealSlot, 'day' | 'mediaCard' | 'description' | 'tags' | 'estimatedMinutes'> & {
      description?: string;
      tags?: string[];
      estimatedMinutes?: number;
    }
  > = vegetarian
    ? [
        {
          meal: 'breakfast',
          title: 'Oatmeal with banana',
          ingredients: [
            { name: 'oats', quantity: 0.5 * servings, unit: 'cup' },
            { name: 'banana', quantity: 1 * servings, unit: 'count' },
            { name: 'milk', quantity: 1 * servings, unit: 'cup' }
          ],
          tags: ['breakfast', 'vegetarian', 'quick'],
          estimatedMinutes: 10
        },
        {
          meal: 'lunch',
          title: 'Tomato pasta',
          ingredients: [
            { name: 'pasta', quantity: 4 * servings, unit: 'oz' },
            { name: 'tomatoes', quantity: 1 * servings, unit: 'can' },
            { name: 'olive oil', quantity: 1 * servings, unit: 'tbsp' }
          ],
          tags: ['lunch', 'vegetarian', 'pasta'],
          estimatedMinutes: 25
        },
        {
          meal: 'dinner',
          title: 'Rice bowl with yogurt',
          ingredients: [
            { name: 'rice', quantity: 1 * servings, unit: 'cup' },
            { name: 'yogurt', quantity: 0.5 * servings, unit: 'cup' },
            { name: 'olive oil', quantity: 1 * servings, unit: 'tbsp' }
          ],
          tags: ['dinner', 'vegetarian', 'bowl'],
          estimatedMinutes: 30
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
          ],
          tags: ['breakfast', 'protein', 'quick'],
          estimatedMinutes: 15
        },
        {
          meal: 'lunch',
          title: 'Chicken rice bowl',
          ingredients: [
            { name: 'chicken', quantity: 0.4 * servings, unit: 'lb' },
            { name: 'rice', quantity: 1 * servings, unit: 'cup' },
            { name: 'olive oil', quantity: 1 * servings, unit: 'tbsp' }
          ],
          tags: ['lunch', 'protein', 'bowl'],
          estimatedMinutes: 35
        },
        {
          meal: 'dinner',
          title: 'Spaghetti with chicken',
          ingredients: [
            { name: 'pasta', quantity: 4 * servings, unit: 'oz' },
            { name: 'tomatoes', quantity: 1 * servings, unit: 'can' },
            { name: 'chicken', quantity: 0.3 * servings, unit: 'lb' }
          ],
          tags: ['dinner', 'pasta', 'protein'],
          estimatedMinutes: 40
        }
      ];

  // Drop templates that conflict with declared allergies before expanding days.
  const safeTemplates = allergyList.length
    ? templates.filter((t) => {
        const probe = enrichSlot({
          day: '1970-01-01',
          ...t
        });
        return mealSlotAllergenHits(probe, allergyList).length === 0;
      })
    : templates;

  // If every template conflicts, fall back to a minimal allergen-safe bowl.
  const effective =
    safeTemplates.length > 0
      ? safeTemplates
      : [
          {
            meal: 'lunch' as const,
            title: 'Rice and olive oil bowl',
            ingredients: [
              { name: 'rice', quantity: 1 * servings, unit: 'cup' },
              { name: 'olive oil', quantity: 1 * servings, unit: 'tbsp' }
            ],
            tags: ['lunch', 'allergen-safe', 'simple'],
            estimatedMinutes: 20
          }
        ];

  const out: MealSlot[] = [];
  const start = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const day = d.toISOString().slice(0, 10);
    for (const t of effective) {
      out.push(enrichSlot({ day, ...t }));
    }
  }
  return out;
}

const MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

/** Normalize / validate a raw meal slot (e.g. from Bedrock JSON). */
export function normalizeMealSlot(raw: unknown, fallbackDay: string): MealSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const meal = String(r.meal ?? '').toLowerCase();
  if (!MEAL_TYPES.has(meal)) return null;
  const title = String(r.title ?? '').trim();
  if (!title) return null;
  const day = String(r.day ?? fallbackDay).slice(0, 10);
  const ingredientsRaw = Array.isArray(r.ingredients) ? r.ingredients : [];
  const ingredients: MealIngredient[] = [];
  for (const ing of ingredientsRaw) {
    if (!ing || typeof ing !== 'object') continue;
    const row = ing as Record<string, unknown>;
    const name = String(row.name ?? '').trim();
    if (!name) continue;
    const quantity = Number(row.quantity);
    ingredients.push({
      name,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit: String(row.unit ?? 'count')
    });
  }
  if (ingredients.length === 0) return null;

  const tags = Array.isArray(r.tags)
    ? r.tags.map(t => String(t)).filter(Boolean)
    : undefined;
  const estimatedMinutes = Number(r.estimatedMinutes);
  const description = r.description != null ? String(r.description) : undefined;

  let mediaCard: MediaCard | undefined;
  if (r.mediaCard && typeof r.mediaCard === 'object') {
    const m = r.mediaCard as Record<string, unknown>;
    mediaCard = {
      title: String(m.title ?? title),
      subtitle: m.subtitle != null ? String(m.subtitle) : undefined,
      text: m.text != null ? String(m.text) : undefined,
      imageUrl: m.imageUrl != null ? String(m.imageUrl) : undefined,
      detailPageUrl: m.detailPageUrl != null ? String(m.detailPageUrl) : undefined
    };
  }

  return enrichSlot({
    day,
    meal: meal as MealSlot['meal'],
    title,
    ingredients,
    description,
    tags,
    estimatedMinutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : undefined,
    mediaCard
  });
}

export function enrichMealPlan(slots: MealSlot[]): MealSlot[] {
  return slots.map(s => enrichSlot(s));
}
