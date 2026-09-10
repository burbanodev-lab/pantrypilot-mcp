/**
 * Mock product catalog with Alexa / shopping-card friendly fields.
 * No Amazon Product Advertising API — deterministic stub for the hackathon MVP.
 */

export type ProductCard = {
  asin: string;
  title: string;
  brand: string;
  category: string;
  priceCents: number;
  currency: 'USD';
  unit: string;
  keywords: string[];
  imageUrl: string;
  detailPageUrl: string;
  rating: number;
  reviewCount: number;
  primeEligible: boolean;
};

export const MOCK_CATALOG: ProductCard[] = [
  {
    asin: 'B0PP-OATS-001',
    title: 'Organic Rolled Oats 42 oz',
    brand: 'PantryPilot Farms',
    category: 'breakfast',
    priceCents: 699,
    currency: 'USD',
    unit: 'oz',
    keywords: ['oats', 'oatmeal', 'breakfast', 'granola'],
    imageUrl: 'https://example.com/img/oats.png',
    detailPageUrl: 'https://example.com/dp/B0PP-OATS-001',
    rating: 4.7,
    reviewCount: 1284,
    primeEligible: true
  },
  {
    asin: 'B0PP-MILK-002',
    title: 'Whole Milk 1 Gallon',
    brand: 'Dairy Grove',
    category: 'dairy',
    priceCents: 429,
    currency: 'USD',
    unit: 'gallon',
    keywords: ['milk', 'dairy', 'whole milk'],
    imageUrl: 'https://example.com/img/milk.png',
    detailPageUrl: 'https://example.com/dp/B0PP-MILK-002',
    rating: 4.5,
    reviewCount: 902,
    primeEligible: true
  },
  {
    asin: 'B0PP-EGGS-003',
    title: 'Large Grade A Eggs 18 ct',
    brand: 'Sunrise Coop',
    category: 'dairy',
    priceCents: 549,
    currency: 'USD',
    unit: 'count',
    keywords: ['eggs', 'breakfast', 'baking'],
    imageUrl: 'https://example.com/img/eggs.png',
    detailPageUrl: 'https://example.com/dp/B0PP-EGGS-003',
    rating: 4.6,
    reviewCount: 2103,
    primeEligible: true
  },
  {
    asin: 'B0PP-RICE-004',
    title: 'Jasmine Rice 5 lb',
    brand: 'Golden Grain',
    category: 'pantry',
    priceCents: 899,
    currency: 'USD',
    unit: 'lb',
    keywords: ['rice', 'jasmine', 'grain', 'dinner'],
    imageUrl: 'https://example.com/img/rice.png',
    detailPageUrl: 'https://example.com/dp/B0PP-RICE-004',
    rating: 4.8,
    reviewCount: 756,
    primeEligible: true
  },
  {
    asin: 'B0PP-CHKN-005',
    title: 'Boneless Chicken Breast 2 lb',
    brand: 'Farm Fresh',
    category: 'protein',
    priceCents: 1099,
    currency: 'USD',
    unit: 'lb',
    keywords: ['chicken', 'protein', 'dinner'],
    imageUrl: 'https://example.com/img/chicken.png',
    detailPageUrl: 'https://example.com/dp/B0PP-CHKN-005',
    rating: 4.4,
    reviewCount: 431,
    primeEligible: true
  },
  {
    asin: 'B0PP-TOMA-006',
    title: 'Canned Diced Tomatoes 14.5 oz (6-pack)',
    brand: 'Valley Pack',
    category: 'pantry',
    priceCents: 799,
    currency: 'USD',
    unit: 'oz',
    keywords: ['tomatoes', 'canned', 'sauce', 'pasta'],
    imageUrl: 'https://example.com/img/tomatoes.png',
    detailPageUrl: 'https://example.com/dp/B0PP-TOMA-006',
    rating: 4.3,
    reviewCount: 512,
    primeEligible: true
  },
  {
    asin: 'B0PP-PSTA-007',
    title: 'Spaghetti Pasta 16 oz (4-pack)',
    brand: 'Nonna Mill',
    category: 'pantry',
    priceCents: 649,
    currency: 'USD',
    unit: 'oz',
    keywords: ['pasta', 'spaghetti', 'dinner', 'carbs'],
    imageUrl: 'https://example.com/img/pasta.png',
    detailPageUrl: 'https://example.com/dp/B0PP-PSTA-007',
    rating: 4.6,
    reviewCount: 1888,
    primeEligible: true
  },
  {
    asin: 'B0PP-OLIV-008',
    title: 'Extra Virgin Olive Oil 750 ml',
    brand: 'Mediterranean Press',
    category: 'pantry',
    priceCents: 1299,
    currency: 'USD',
    unit: 'ml',
    keywords: ['olive oil', 'oil', 'cooking'],
    imageUrl: 'https://example.com/img/oliveoil.png',
    detailPageUrl: 'https://example.com/dp/B0PP-OLIV-008',
    rating: 4.7,
    reviewCount: 3201,
    primeEligible: true
  },
  {
    asin: 'B0PP-BANA-009',
    title: 'Bananas Bunch (~5)',
    brand: 'Produce Box',
    category: 'produce',
    priceCents: 149,
    currency: 'USD',
    unit: 'bunch',
    keywords: ['banana', 'fruit', 'snack', 'breakfast'],
    imageUrl: 'https://example.com/img/bananas.png',
    detailPageUrl: 'https://example.com/dp/B0PP-BANA-009',
    rating: 4.2,
    reviewCount: 640,
    primeEligible: false
  },
  {
    asin: 'B0PP-YGRT-010',
    title: 'Greek Yogurt Plain 32 oz',
    brand: 'Alpine Creamery',
    category: 'dairy',
    priceCents: 599,
    currency: 'USD',
    unit: 'oz',
    keywords: ['yogurt', 'greek', 'breakfast', 'protein'],
    imageUrl: 'https://example.com/img/yogurt.png',
    detailPageUrl: 'https://example.com/dp/B0PP-YGRT-010',
    rating: 4.5,
    reviewCount: 1102,
    primeEligible: true
  }
];

export function searchCatalog(query: string, limit = 5): ProductCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return MOCK_CATALOG.slice(0, limit);
  const scored = MOCK_CATALOG.map(p => {
    const hay = [p.title, p.brand, p.category, ...p.keywords].join(' ').toLowerCase();
    let score = 0;
    for (const token of q.split(/\s+/)) {
      if (hay.includes(token)) score += 2;
      if (p.keywords.some(k => k === token)) score += 3;
      if (p.title.toLowerCase().includes(token)) score += 1;
    }
    return { p, score };
  })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(x => x.p);
}

export function matchProductForIngredient(name: string): ProductCard | undefined {
  const hits = searchCatalog(name, 1);
  return hits[0];
}
