/**
 * SQLite persistence via sql.js (WASM) — no native build tools required.
 * Path: DATABASE_PATH env, default ./data/pantrypilot.sqlite
 */
import { createRequire } from 'node:module';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type {
  CartDraft,
  HouseholdPrefs,
  HouseholdState,
  MealSlot,
  PantryItem,
  ShopLine
} from './state.js';

const require = createRequire(import.meta.url);

export function resolveDatabasePath(): string {
  return (
    process.env.DATABASE_PATH?.trim() ||
    process.env.PANTRYPILOT_DB?.trim() ||
    './data/pantrypilot.sqlite'
  );
}

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let dbPath = resolveDatabasePath();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 50;

function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call await initDatabase() before serving.');
  }
  return db;
}

function migrate(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS households (
      household_id TEXT PRIMARY KEY,
      prefs_json TEXT NOT NULL DEFAULT '{}',
      meal_plan_json TEXT NOT NULL DEFAULT '[]',
      shop_list_json TEXT NOT NULL DEFAULT '[]',
      cart_json TEXT,
      notes_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS pantry_items (
      household_id TEXT NOT NULL,
      item_key TEXT NOT NULL,
      sku TEXT,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      expires_at TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (household_id, item_key),
      FOREIGN KEY (household_id) REFERENCES households(household_id)
    );
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS session_map (
      session_id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  database.run(`
    CREATE INDEX IF NOT EXISTS idx_pantry_household ON pantry_items(household_id);
  `);
  database.run(`
    CREATE INDEX IF NOT EXISTS idx_session_household ON session_map(household_id);
  `);
}

function flushSync(): void {
  if (!db) return;
  const dir = dirname(dbPath);
  mkdirSync(dir, { recursive: true });
  const data = db.export();
  const tmp = `${dbPath}.tmp`;
  writeFileSync(tmp, Buffer.from(data));
  renameSync(tmp, dbPath);
}

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      flushSync();
    } catch (err) {
      console.error('[pantrypilot] SQLite persist failed:', err);
    }
  }, PERSIST_DEBOUNCE_MS);
}

/** Force immediate write (tests / shutdown). */
export function persistDatabaseNow(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  flushSync();
}

export async function initDatabase(pathOverride?: string): Promise<string> {
  dbPath = pathOverride?.trim() || resolveDatabasePath();
  if (!SQL) {
    const distDir = dirname(require.resolve('sql.js'));
    SQL = await initSqlJs({
      locateFile: (file: string) => join(distDir, file)
    });
  }

  mkdirSync(dirname(dbPath), { recursive: true });
  if (existsSync(dbPath)) {
    const buf = readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  migrate(db);
  flushSync();
  console.log(`[pantrypilot] SQLite ready at ${dbPath}`);
  return dbPath;
}

export function isDatabaseReady(): boolean {
  return db !== null;
}

export function closeDatabase(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (db) {
    try {
      flushSync();
    } catch {
      /* ignore */
    }
    db.close();
    db = null;
  }
}

function defaultPrefs(): HouseholdPrefs {
  return { diet: [], allergies: [], avoid: [], servings: 2 };
}

export function dbEnsureHousehold(householdId: string, updatedAt: string): void {
  const database = getDb();
  const row = database.exec(
    'SELECT household_id FROM households WHERE household_id = ?',
    [householdId]
  );
  if (row.length === 0 || row[0].values.length === 0) {
    database.run(
      `INSERT INTO households (household_id, prefs_json, meal_plan_json, shop_list_json, cart_json, notes_json, updated_at)
       VALUES (?, ?, '[]', '[]', NULL, '[]', ?)`,
      [householdId, JSON.stringify(defaultPrefs()), updatedAt]
    );
    schedulePersist();
  }
}

export function dbLoadHousehold(householdId: string): Omit<HouseholdState, 'pantry'> & {
  pantry: Map<string, PantryItem>;
} | null {
  const database = getDb();
  const hs = database.exec(
    `SELECT household_id, prefs_json, meal_plan_json, shop_list_json, cart_json, notes_json, updated_at
     FROM households WHERE household_id = ?`,
    [householdId]
  );
  if (hs.length === 0 || hs[0].values.length === 0) return null;

  const cols = hs[0].columns;
  const vals = hs[0].values[0];
  const get = (name: string) => vals[cols.indexOf(name)];

  const pantry = new Map<string, PantryItem>();
  const items = database.exec(
    `SELECT item_key, sku, name, quantity, unit, expires_at, updated_at
     FROM pantry_items WHERE household_id = ?`,
    [householdId]
  );
  if (items.length > 0) {
    const ic = items[0].columns;
    for (const row of items[0].values) {
      const g = (n: string) => row[ic.indexOf(n)];
      const key = String(g('item_key'));
      pantry.set(key, {
        sku: g('sku') != null ? String(g('sku')) : undefined,
        name: String(g('name')),
        quantity: Number(g('quantity')),
        unit: String(g('unit')),
        expiresAt: g('expires_at') != null ? String(g('expires_at')) : undefined,
        updatedAt: String(g('updated_at'))
      });
    }
  }

  let prefs: HouseholdPrefs = defaultPrefs();
  try {
    prefs = { ...defaultPrefs(), ...JSON.parse(String(get('prefs_json') || '{}')) };
  } catch {
    /* keep defaults */
  }

  let mealPlan: MealSlot[] = [];
  let shopList: ShopLine[] = [];
  let notes: string[] = [];
  let cart: CartDraft | undefined;
  try {
    mealPlan = JSON.parse(String(get('meal_plan_json') || '[]'));
  } catch {
    mealPlan = [];
  }
  try {
    shopList = JSON.parse(String(get('shop_list_json') || '[]'));
  } catch {
    shopList = [];
  }
  try {
    notes = JSON.parse(String(get('notes_json') || '[]'));
  } catch {
    notes = [];
  }
  const cartRaw = get('cart_json');
  if (cartRaw != null && String(cartRaw).length > 0) {
    try {
      cart = JSON.parse(String(cartRaw)) as CartDraft;
    } catch {
      cart = undefined;
    }
  }

  return {
    householdId: String(get('household_id')),
    pantry,
    prefs,
    mealPlan,
    shopList,
    cart,
    notes,
    updatedAt: String(get('updated_at'))
  };
}

export function dbSaveHousehold(h: HouseholdState): void {
  const database = getDb();
  database.run(
    `INSERT INTO households (household_id, prefs_json, meal_plan_json, shop_list_json, cart_json, notes_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(household_id) DO UPDATE SET
       prefs_json = excluded.prefs_json,
       meal_plan_json = excluded.meal_plan_json,
       shop_list_json = excluded.shop_list_json,
       cart_json = excluded.cart_json,
       notes_json = excluded.notes_json,
       updated_at = excluded.updated_at`,
    [
      h.householdId,
      JSON.stringify(h.prefs ?? defaultPrefs()),
      JSON.stringify(h.mealPlan ?? []),
      JSON.stringify(h.shopList ?? []),
      h.cart ? JSON.stringify(h.cart) : null,
      JSON.stringify(h.notes ?? []),
      h.updatedAt
    ]
  );

  database.run('DELETE FROM pantry_items WHERE household_id = ?', [h.householdId]);
  for (const [key, item] of h.pantry.entries()) {
    database.run(
      `INSERT INTO pantry_items (household_id, item_key, sku, name, quantity, unit, expires_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        h.householdId,
        key,
        item.sku ?? null,
        item.name,
        item.quantity,
        item.unit,
        item.expiresAt ?? null,
        item.updatedAt
      ]
    );
  }
  schedulePersist();
}

export function dbBindSession(sessionId: string, householdId: string, updatedAt: string): void {
  const database = getDb();
  database.run(
    `INSERT INTO session_map (session_id, household_id, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       household_id = excluded.household_id,
       updated_at = excluded.updated_at`,
    [sessionId, householdId, updatedAt]
  );
  schedulePersist();
}

export function dbResolveSession(sessionId: string): string | undefined {
  const database = getDb();
  const rows = database.exec(
    'SELECT household_id FROM session_map WHERE session_id = ?',
    [sessionId]
  );
  if (rows.length === 0 || rows[0].values.length === 0) return undefined;
  return String(rows[0].values[0][0]);
}

export function dbListHouseholdIds(): string[] {
  if (!isDatabaseReady()) return [];
  const database = getDb();
  const rows = database.exec('SELECT household_id FROM households ORDER BY household_id');
  if (rows.length === 0) return [];
  return rows[0].values.map((v) => String(v[0]));
}

export function dbClearAll(): void {
  const database = getDb();
  database.run('DELETE FROM pantry_items');
  database.run('DELETE FROM session_map');
  database.run('DELETE FROM households');
  schedulePersist();
}

