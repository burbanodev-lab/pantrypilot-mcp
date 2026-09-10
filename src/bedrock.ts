/**
 * Optional Amazon Bedrock path for meal_plan.
 * Enabled only when AWS_REGION + BEDROCK_MODEL_ID are set (plus standard AWS credential env / chain).
 * On missing config or invoke failure, callers keep the deterministic stub.
 */
import {
  BedrockRuntimeClient,
  ConverseCommand
} from '@aws-sdk/client-bedrock-runtime';
import type { HouseholdPrefs, MealSlot, PantryItem } from './state.js';
import { normalizeMealSlot } from './meals.js';

export type MealPlanSource = 'bedrock' | 'stub';

export function isBedrockConfigured(): boolean {
  return Boolean(process.env.AWS_REGION?.trim() && process.env.BEDROCK_MODEL_ID?.trim());
}

function extractJsonArray(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  const start = body.indexOf('[');
  const end = body.lastIndexOf(']');
  if (start >= 0 && end > start) {
    return JSON.parse(body.slice(start, end + 1));
  }
  return JSON.parse(body);
}

export type BedrockMealPlanInput = {
  days: number;
  servings: number;
  prefs: HouseholdPrefs;
  pantry: PantryItem[];
};

/**
 * Ask Bedrock (Converse) for a structured meal plan JSON array.
 * Throws on config/network/parse errors — caller should fall back to stub.
 */
export async function generateMealPlanWithBedrock(
  input: BedrockMealPlanInput
): Promise<MealSlot[]> {
  const region = process.env.AWS_REGION!.trim();
  const modelId = process.env.BEDROCK_MODEL_ID!.trim();

  const client = new BedrockRuntimeClient({ region });

  const pantrySummary =
    input.pantry.length === 0
      ? '(empty)'
      : input.pantry
          .map(p => `${p.name}: ${p.quantity} ${p.unit}`)
          .slice(0, 40)
          .join('; ');

  const system = [
    {
      text:
        'You are PantryPilot meal planner. Reply with ONLY a JSON array of meal objects. ' +
        'Each object must have: day (YYYY-MM-DD), meal (breakfast|lunch|dinner|snack), title (string), ' +
        'ingredients (array of {name, quantity number, unit}), optional description, tags (string[]), ' +
        'estimatedMinutes (number). Prefer ingredients already in the pantry when sensible. ' +
        'Respect diet, allergies, and avoid lists. Scale quantities for the given servings. No markdown.'
    }
  ];

  const userText = [
    `Generate a ${input.days}-day meal plan (breakfast, lunch, dinner each day).`,
    `Servings per meal: ${input.servings}`,
    `Diet: ${JSON.stringify(input.prefs.diet ?? [])}`,
    `Allergies: ${JSON.stringify(input.prefs.allergies ?? [])}`,
    `Avoid: ${JSON.stringify(input.prefs.avoid ?? [])}`,
    `Cuisine bias: ${JSON.stringify(input.prefs.cuisineBias ?? [])}`,
    `Pantry on hand: ${pantrySummary}`,
    `Start day: ${new Date().toISOString().slice(0, 10)}`
  ].join('\n');

  const response = await client.send(
    new ConverseCommand({
      modelId,
      system,
      messages: [{ role: 'user', content: [{ text: userText }] }],
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.4
      }
    })
  );

  const text = response.output?.message?.content
    ?.map(block => ('text' in block && block.text ? block.text : ''))
    .join('')
    .trim();

  if (!text) {
    throw new Error('Bedrock returned empty content');
  }

  const parsed = extractJsonArray(text);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Bedrock meal plan JSON was not a non-empty array');
  }

  const startDay = new Date().toISOString().slice(0, 10);
  const slots: MealSlot[] = [];
  for (const item of parsed) {
    const slot = normalizeMealSlot(item, startDay);
    if (slot) slots.push(slot);
  }
  if (slots.length === 0) {
    throw new Error('Bedrock meal plan produced no valid slots');
  }
  return slots;
}
