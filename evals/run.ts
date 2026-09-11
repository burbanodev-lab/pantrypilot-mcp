/**
 * Scripted evals for GenAI bonus: pantry→meal→cart happy path + one failure case.
 * Spawns an ephemeral MCP server (same pattern as smoke). No secrets.
 */
import { mkdtempSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startServer } from '../src/server.js';

type CaseResult = { name: string; ok: boolean; detail: string };

function toolText(result: { content?: unknown; isError?: boolean }): string {
  const parts = Array.isArray(result.content) ? result.content : [];
  return parts
    .map((c) => (typeof c === 'object' && c && 'text' in c ? String((c as { text?: string }).text ?? '') : ''))
    .join('');
}

function parseJson(result: { content?: unknown; isError?: boolean }): Record<string, unknown> {
  if (result.isError) throw new Error(`tool isError: ${toolText(result)}`);
  const text = toolText(result);
  return JSON.parse(text) as Record<string, unknown>;
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'pantrypilot-eval-'));
  process.env.DATABASE_PATH = join(dir, 'eval.sqlite');

  const { port, host } = await startServer(0, '127.0.0.1');
  const url = `http://${host}:${port}/mcp`;
  const client = new Client({ name: 'pantrypilot-eval', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url));
  const results: CaseResult[] = [];

  try {
    await client.connect(transport);

    // --- Happy path: pantry → kitchen_run → cart + mediaCards ---
    try {
      const hid = 'eval-happy';
      await client.callTool({
        name: 'prefs_set',
        arguments: {
          householdId: hid,
          diet: ['omnivore'],
          allergies: ['peanuts'],
          servings: 2,
          budgetCents: 50000
        }
      });
      await client.callTool({
        name: 'pantry_upsert',
        arguments: {
          householdId: hid,
          items: [
            { name: 'eggs', quantity: 6, unit: 'count' },
            { name: 'milk', quantity: 1, unit: 'L', expiresAt: '2026-10-16' },
            { name: 'rice', quantity: 2, unit: 'cup' }
          ]
        }
      });
      const run = parseJson(
        await client.callTool({
          name: 'kitchen_run',
          arguments: { householdId: hid, days: 2, goal: 'weekly', budgetCents: 50000 }
        })
      );
      const steps = (run.steps as { tool: string; ok: boolean }[]) ?? [];
      const expectedTools = [
        'pantry_query',
        'meal_plan',
        'shop_list_build',
        'product_search',
        'cart_draft'
      ];
      const stepNames = steps.map((s) => s.tool);
      const allStepsOk = steps.length > 0 && steps.every((s) => s.ok);
      const hasChain = expectedTools.every((t) => stepNames.includes(t));
      const cart = run.cart as { lines?: unknown[]; totalCents?: number } | null;
      const cards = (run.mediaCards as unknown[]) ?? [];
      const ok =
        run.ok === true &&
        allStepsOk &&
        hasChain &&
        !!cart &&
        Array.isArray(cart.lines) &&
        cart.lines.length > 0 &&
        cards.length > 0;
      results.push({
        name: 'happy_path_pantry_meal_cart',
        ok,
        detail: ok
          ? `steps=${steps.length} cartLines=${cart!.lines!.length} cards=${cards.length} totalMs=${run.totalMs}`
          : `ok=${run.ok} stepsOk=${allStepsOk} chain=${hasChain} cart=${!!cart} cards=${cards.length}`
      });
    } catch (err) {
      results.push({
        name: 'happy_path_pantry_meal_cart',
        ok: false,
        detail: err instanceof Error ? err.message : String(err)
      });
    }

    // --- Failure case: cart_confirm without draft ---
    try {
      const hid = 'eval-fail-no-cart';
      const conf = parseJson(
        await client.callTool({
          name: 'cart_confirm',
          arguments: { householdId: hid }
        })
      );
      const ok =
        conf.ok === false &&
        typeof conf.error === 'string' &&
        /cart draft/i.test(conf.error);
      results.push({
        name: 'failure_cart_confirm_without_draft',
        ok,
        detail: ok
          ? `expected soft-fail: ${conf.error}`
          : `unexpected payload: ${JSON.stringify(conf).slice(0, 240)}`
      });
    } catch (err) {
      results.push({
        name: 'failure_cart_confirm_without_draft',
        ok: false,
        detail: err instanceof Error ? err.message : String(err)
      });
    }

    // --- Shop list: partial pantry + same ingredient across 2 meal days ---
    // Stub breakfast needs 2*servings eggs/day. servings=1, days=2 → total 4.
    // Pantry eggs=1 → correct shopQty=3. Buggy per-meal shortfall reuse → 2.
    try {
      const hid = 'eval-shop-undercount';
      await client.callTool({
        name: 'prefs_set',
        arguments: { householdId: hid, diet: ['omnivore'], servings: 1 }
      });
      await client.callTool({
        name: 'pantry_upsert',
        arguments: {
          householdId: hid,
          items: [{ name: 'eggs', quantity: 1, unit: 'count' }]
        }
      });
      await client.callTool({
        name: 'meal_plan',
        arguments: { householdId: hid, days: 2 }
      });
      const shop = parseJson(
        await client.callTool({
          name: 'shop_list_build',
          arguments: { householdId: hid }
        })
      );
      const shopList = (shop.shopList as { name: string; quantity: number; unit: string }[]) ?? [];
      const eggs = shopList.find(
        (l) => l.name.toLowerCase() === 'eggs' && l.unit.toLowerCase() === 'count'
      );
      const ok = !!eggs && eggs.quantity === 3;
      results.push({
        name: 'shop_list_partial_pantry_multi_meal',
        ok,
        detail: ok
          ? `eggs shopQty=${eggs!.quantity} (totalNeed=4 pantry=1)`
          : `expected eggs quantity 3, got ${eggs ? eggs.quantity : 'missing'}; lines=${shopList.length}`
      });
    } catch (err) {
      results.push({
        name: 'shop_list_partial_pantry_multi_meal',
        ok: false,
        detail: err instanceof Error ? err.message : String(err)
      });
    }


    // --- Unit aliases: pantry "cups" must match meal stub "cup" ---
    try {
      const hid = 'eval-unit-alias-cups';
      await client.callTool({
        name: 'prefs_set',
        arguments: { householdId: hid, diet: ['omnivore'], servings: 1 }
      });
      await client.callTool({
        name: 'pantry_upsert',
        arguments: {
          householdId: hid,
          items: [{ name: 'rice', quantity: 100, unit: 'cups' }]
        }
      });
      await client.callTool({
        name: 'meal_plan',
        arguments: { householdId: hid, days: 1 }
      });
      const shop = parseJson(
        await client.callTool({
          name: 'shop_list_build',
          arguments: { householdId: hid }
        })
      );
      const shopList = (shop.shopList as { name: string; quantity: number; unit: string }[]) ?? [];
      const rice = shopList.find((l) => l.name.toLowerCase() === 'rice');
      const ok = !rice;
      results.push({
        name: 'shop_list_unit_alias_cups_matches_cup',
        ok,
        detail: ok
          ? 'rice absent from shop list (cups aliased to cup)'
          : `expected no rice shortfall, got ${rice ? rice.quantity + ' ' + rice.unit : 'other lines=' + shopList.length}`
      });
    } catch (err) {
      results.push({
        name: 'shop_list_unit_alias_cups_matches_cup',
        ok: false,
        detail: err instanceof Error ? err.message : String(err)
      });
    }

    // --- Demo pantry units: milk as cup (not L) reduces shop shortfall ---
    try {
      const hid = 'eval-demo-milk-cup';
      await client.callTool({
        name: 'prefs_set',
        arguments: { householdId: hid, diet: ['omnivore'], servings: 2 }
      });
      // Mirror companion sample pantry units after the adversarial fix.
      await client.callTool({
        name: 'pantry_upsert',
        arguments: {
          householdId: hid,
          items: [
            { name: 'eggs', quantity: 6, unit: 'count' },
            { name: 'milk', quantity: 2, unit: 'cup', expiresAt: '2026-10-16' },
            { name: 'rice', quantity: 2, unit: 'cup' }
          ]
        }
      });
      await client.callTool({
        name: 'meal_plan',
        arguments: { householdId: hid, days: 1 }
      });
      const shop = parseJson(
        await client.callTool({
          name: 'shop_list_build',
          arguments: { householdId: hid }
        })
      );
      const shopList = (shop.shopList as { name: string; quantity: number; unit: string }[]) ?? [];
      const milk = shopList.find(
        (l) => l.name.toLowerCase() === 'milk' && l.unit.toLowerCase() === 'cup'
      );
      // Stub breakfast needs 0.5*servings=1 cup milk for 1 day → pantry 2 covers it.
      const ok = !milk;
      results.push({
        name: 'shop_list_demo_milk_cup_covered',
        ok,
        detail: ok
          ? 'milk covered by pantry cup stock'
          : `expected no milk shortfall, got ${milk ? milk.quantity : 'missing'}; lines=${JSON.stringify(shopList).slice(0, 200)}`
      });
    } catch (err) {
      results.push({
        name: 'shop_list_demo_milk_cup_covered',
        ok: false,
        detail: err instanceof Error ? err.message : String(err)
      });
    }

    // --- Host allow-list: public mcpize hostname accepted; unknown rejected ---
    // Use raw http.request — undici fetch forbids overriding the Host header.
    try {
      const probe = (hostnameHeader: string) =>
        new Promise<{ status: number; body: string }>((resolve, reject) => {
          const req = httpRequest(
            {
              host: '127.0.0.1',
              port,
              path: '/health',
              method: 'GET',
              headers: { Host: hostnameHeader }
            },
            (res) => {
              const chunks: Buffer[] = [];
              res.on('data', (c) => chunks.push(c));
              res.on('end', () =>
                resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') })
              );
            }
          );
          req.on('error', reject);
          req.end();
        });

      const okRes = await probe('pantrypilot.mcpize.run');
      const badRes = await probe('evil.example');
      const okBody = JSON.parse(okRes.body) as { ok?: boolean; name?: string };
      const badBody = JSON.parse(badRes.body) as { error?: { message?: string } };
      const ok =
        okRes.status === 200 &&
        okBody.ok === true &&
        okBody.name === 'pantrypilot-mcp' &&
        badRes.status === 403 &&
        /Invalid Host/i.test(String(badBody.error?.message ?? ''));
      results.push({
        name: 'allowed_hosts_mcpize_public_hostname',
        ok,
        detail: ok
          ? 'pantrypilot.mcpize.run allowed; evil.example rejected'
          : `okStatus=${okRes.status} badStatus=${badRes.status} okBody=${okRes.body.slice(0, 120)} badBody=${badRes.body.slice(0, 120)}`
      });
    } catch (err) {
      results.push({
        name: 'allowed_hosts_mcpize_public_hostname',
        ok: false,
        detail: err instanceof Error ? err.message : String(err)
      });
    }


    // --- MCP resources + prompts (GenAI Track 04/05 surface) ---
    try {
      const hid = 'eval-resources-prompts';
      await client.callTool({
        name: 'pantry_upsert',
        arguments: {
          householdId: hid,
          items: [
            { name: 'milk', quantity: 1, unit: 'cup', expiresAt: '2026-10-16' },
            { name: 'spinach', quantity: 1, unit: 'bag', expiresAt: '2026-10-15' }
          ]
        }
      });

      const resources = await client.listResources();
      const uris = (resources.resources ?? []).map((r: { uri: string }) => r.uri);
      const hasOverview = uris.includes('pantry://agent/overview');
      const householdUri = uris.find((u: string) => u.includes(encodeURIComponent(hid)) || u.endsWith(`/${hid}`));

      const read = await client.readResource({
        uri: householdUri ?? `pantry://household/${hid}`
      });
      const text = (read.contents?.[0] as { text?: string } | undefined)?.text ?? '';
      const snap = JSON.parse(text) as { householdId?: string; pantryCount?: number; expiringSoon?: unknown[] };
      const prompts = await client.listPrompts();
      const promptNames = (prompts.prompts ?? []).map((p: { name: string }) => p.name);
      const gotPrompt = await client.getPrompt({
        name: 'use_up_expiring',
        arguments: { householdId: hid, days: '2' }
      });
      const promptText = gotPrompt.messages?.[0]?.content;
      const promptBody =
        typeof promptText === 'object' && promptText && 'text' in promptText
          ? String((promptText as { text: string }).text)
          : '';

      const ok =
        hasOverview &&
        snap.householdId === hid &&
        (snap.pantryCount ?? 0) >= 2 &&
        Array.isArray(snap.expiringSoon) &&
        promptNames.includes('use_up_expiring') &&
        promptNames.includes('weekly_kitchen') &&
        /kitchen_run/i.test(promptBody) &&
        /use_expiring/i.test(promptBody);

      results.push({
        name: 'resources_and_prompts_kitchen',
        ok,
        detail: ok
          ? `overview+household snap pantry=${snap.pantryCount} prompts=${promptNames.length}`
          : `hasOverview=${hasOverview} snap=${text.slice(0, 120)} prompts=${promptNames.join(',')} body=${promptBody.slice(0, 80)}`
      });
    } catch (err) {
      results.push({
        name: 'resources_and_prompts_kitchen',
        ok: false,
        detail: err instanceof Error ? err.message : String(err)
      });
    }


    // --- Hard gate: allergen blocks milk product suggestions ---
    try {
      const hid = 'eval-allergen-block';
      await client.callTool({
        name: 'prefs_set',
        arguments: {
          householdId: hid,
          diet: ['omnivore'],
          allergies: ['milk'],
          servings: 2
        }
      });
      const search = parseJson(
        await client.callTool({
          name: 'product_search',
          arguments: { householdId: hid, query: 'milk', limit: 5, enrich: true }
        })
      );
      const gate = search.allergenGate as {
        code?: string;
        blockedCount?: number;
        keptCount?: number;
      };
      const products = (search.products as unknown[]) ?? [];
      const off = search.openFoodFacts as { source?: string; query?: string } | undefined;
      const meal = parseJson(
        await client.callTool({
          name: 'meal_plan',
          arguments: { householdId: hid, days: 1 }
        })
      );
      const plan = (meal.mealPlan as { title: string; ingredients: { name: string }[] }[]) ?? [];
      const milkInPlan = plan.some(
        (s) =>
          /milk|yogurt|dairy/i.test(s.title) ||
          s.ingredients.some((i) => /milk|yogurt|cheese|butter/i.test(i.name))
      );
      const ok =
        search.ok === false &&
        (gate?.code === 'ALLERGEN_BLOCKED' || (gate?.blockedCount ?? 0) > 0) &&
        products.length === 0 &&
        !milkInPlan &&
        !!off &&
        (off.source === 'openfoodfacts' || off.source === 'offline_stub');
      results.push({
        name: 'allergen_gate_blocks_milk',
        ok,
        detail: ok
          ? `productGate=${gate?.code} mealSlots=${plan.length} off=${off?.source}`
          : `ok=${search.ok} gate=${JSON.stringify(gate)} products=${products.length} milkInPlan=${milkInPlan} off=${JSON.stringify(off)?.slice(0, 120)}`
      });
    } catch (err) {
      results.push({
        name: 'allergen_gate_blocks_milk',
        ok: false,
        detail: err instanceof Error ? err.message : String(err)
      });
    }

    // --- Hard gate: budget ceiling rejects over-budget cart ---
    try {
      const hid = 'eval-budget-exceeded';
      await client.callTool({
        name: 'prefs_set',
        arguments: {
          householdId: hid,
          diet: ['omnivore'],
          allergies: [],
          servings: 2,
          budgetCents: 100
        }
      });
      await client.callTool({
        name: 'pantry_upsert',
        arguments: {
          householdId: hid,
          items: [{ name: 'salt', quantity: 1, unit: 'tsp' }]
        }
      });
      const run = parseJson(
        await client.callTool({
          name: 'kitchen_run',
          arguments: { householdId: hid, days: 2, goal: 'weekly', budgetCents: 100 }
        })
      );
      const budgetGate = run.budgetGate as {
        code?: string;
        ok?: boolean;
        totalCents?: number;
        budgetCents?: number;
      };
      const cartStep = ((run.steps as { tool: string; ok: boolean; error?: string }[]) ?? []).find(
        (s) => s.tool === 'cart_draft'
      );
      const ok =
        run.ok === false &&
        budgetGate?.code === 'BUDGET_EXCEEDED' &&
        budgetGate?.ok === false &&
        cartStep?.ok === false &&
        run.cart == null &&
        typeof budgetGate?.totalCents === 'number' &&
        (budgetGate.totalCents as number) > 100;
      results.push({
        name: 'budget_gate_rejects_over_ceiling',
        ok,
        detail: ok
          ? `totalCents=${budgetGate!.totalCents} budget=100 cartStepFail=1`
          : `ok=${run.ok} gate=${JSON.stringify(budgetGate)} cartStep=${JSON.stringify(cartStep)} cart=${run.cart}`
      });
    } catch (err) {
      results.push({
        name: 'budget_gate_rejects_over_ceiling',
        ok: false,
        detail: err instanceof Error ? err.message : String(err)
      });
    }

    // --- Hard gates happy path: peanut allergy + ample budget still drafts cart ---
    try {
      const hid = 'eval-gates-happy';
      await client.callTool({
        name: 'prefs_set',
        arguments: {
          householdId: hid,
          diet: ['omnivore'],
          allergies: ['peanuts'],
          servings: 2,
          budgetCents: 50000
        }
      });
      await client.callTool({
        name: 'pantry_upsert',
        arguments: {
          householdId: hid,
          items: [
            { name: 'eggs', quantity: 12, unit: 'count' },
            { name: 'milk', quantity: 4, unit: 'cup' },
            { name: 'rice', quantity: 4, unit: 'cup' }
          ]
        }
      });
      const run = parseJson(
        await client.callTool({
          name: 'kitchen_run',
          arguments: { householdId: hid, days: 1, goal: 'weekly', budgetCents: 50000 }
        })
      );
      const allergenGate = run.allergenGate as { code?: string } | undefined;
      const budgetGate = run.budgetGate as { code?: string; ok?: boolean } | undefined;
      const cart = run.cart as { lines?: unknown[]; totalCents?: number } | null;
      const ok =
        run.ok === true &&
        (allergenGate?.code === 'ALLERGEN_OK' || allergenGate?.code === 'ALLERGEN_FILTERED') &&
        budgetGate?.code === 'BUDGET_OK' &&
        budgetGate?.ok === true &&
        !!cart &&
        Array.isArray(cart.lines) &&
        cart.lines.length > 0;
      results.push({
        name: 'gates_happy_path_allergen_ok_budget_ok',
        ok,
        detail: ok
          ? `allergen=${allergenGate?.code} budget=${budgetGate?.code} lines=${cart!.lines!.length} total=${cart!.totalCents}`
          : `ok=${run.ok} allergen=${JSON.stringify(allergenGate)} budget=${JSON.stringify(budgetGate)} cart=${!!cart}`
      });
    } catch (err) {
      results.push({
        name: 'gates_happy_path_allergen_ok_budget_ok',
        ok: false,
        detail: err instanceof Error ? err.message : String(err)
      });
    }

    let failed = 0;
    for (const r of results) {
      const mark = r.ok ? 'PASS' : 'FAIL';
      console.log(`${mark} ${r.name} — ${r.detail}`);
      if (!r.ok) failed += 1;
    }
    if (failed) {
      console.error(`EVAL FAILED (${failed}/${results.length})`);
      process.exit(1);
    }
    console.log(`EVAL PASSED (${results.length}/${results.length})`);
    process.exit(0);
  } finally {
    await client.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error('EVAL FAILED', err);
  process.exit(1);
});
