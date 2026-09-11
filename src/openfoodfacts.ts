/**
 * Open Food Facts enrichment hook with offline fallback.
 * Live fetch is best-effort (short timeout); never fails the agent path.
 */
export type OffEnrichment = {
  source: 'openfoodfacts' | 'offline_stub';
  query: string;
  productName?: string;
  brands?: string;
  allergens?: string;
  ingredientsText?: string;
  nutriscoreGrade?: string;
  code?: string;
  url?: string;
  fetchedAt: string;
  note?: string;
};

const OFF_SEARCH =
  'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&json=1&page_size=1&search_terms=';

/** Deterministic offline enrichment when network is unavailable or disabled. */
export function offlineOffStub(query: string): OffEnrichment {
  const q = query.trim().toLowerCase() || 'food';
  return {
    source: 'offline_stub',
    query: q,
    productName: `Stub enrichment for "${q}"`,
    brands: 'PantryPilot Offline',
    allergens: '',
    ingredientsText: `Offline fallback — no live Open Food Facts data for ${q}.`,
    nutriscoreGrade: undefined,
    code: `OFF-STUB-${q.replace(/\s+/g, '-').slice(0, 24)}`,
    url: undefined,
    fetchedAt: new Date().toISOString(),
    note: 'Set OPENFOODFACTS=0 to force offline; live fetch uses a short timeout.'
  };
}

function envAllowsLiveFetch(): boolean {
  const v = process.env.OPENFOODFACTS?.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off') return false;
  return true;
}

/**
 * Enrich a product query via Open Food Facts search API.
 * Always resolves (live or offline_stub); never throws to callers.
 */
export async function enrichFromOpenFoodFacts(
  query: string,
  opts: { timeoutMs?: number } = {}
): Promise<OffEnrichment> {
  const q = query.trim();
  if (!q) return offlineOffStub('unknown');
  if (!envAllowsLiveFetch()) return offlineOffStub(q);

  const timeoutMs = opts.timeoutMs ?? 2500;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = `${OFF_SEARCH}${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'PantryPilot-MCP/0.1 (hackathon; offline-fallback)' }
    });
    if (!res.ok) return offlineOffStub(q);
    const data = (await res.json()) as {
      products?: Array<Record<string, unknown>>;
    };
    const p = data.products?.[0];
    if (!p) return offlineOffStub(q);
    const code = p.code != null ? String(p.code) : undefined;
    return {
      source: 'openfoodfacts',
      query: q,
      productName: p.product_name != null ? String(p.product_name) : undefined,
      brands: p.brands != null ? String(p.brands) : undefined,
      allergens: p.allergens_from_ingredients != null
        ? String(p.allergens_from_ingredients)
        : p.allergens != null
          ? String(p.allergens)
          : undefined,
      ingredientsText:
        p.ingredients_text != null ? String(p.ingredients_text).slice(0, 400) : undefined,
      nutriscoreGrade:
        p.nutriscore_grade != null ? String(p.nutriscore_grade) : undefined,
      code,
      url: code ? `https://world.openfoodfacts.org/product/${code}` : undefined,
      fetchedAt: new Date().toISOString()
    };
  } catch {
    return offlineOffStub(q);
  } finally {
    clearTimeout(timer);
  }
}
