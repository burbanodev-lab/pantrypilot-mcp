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
          budgetCents: 4500
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
          arguments: { householdId: hid, days: 2, goal: 'weekly', budgetCents: 4500 }
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
