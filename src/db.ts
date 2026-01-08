import Database from 'better-sqlite3';
import { join } from 'path';

const db = new Database(join(process.cwd(), 'app.db'));

db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      fitbit_food_id INTEGER NOT NULL,
      default_unit_id INTEGER NOT NULL,
      default_amount REAL NOT NULL,
      calories REAL NOT NULL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      created_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      request_hash TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type_id INTEGER NOT NULL,
      request_json TEXT NOT NULL,
      fitbit_response_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
}

export interface TokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export function getTokens(): TokenRow | null {
  const stmt = db.prepare('SELECT access_token, refresh_token, expires_at FROM tokens WHERE id = 1');
  return stmt.get() as TokenRow | null;
}

export function saveTokens(accessToken: string, refreshToken: string, expiresIn: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const stmt = db.prepare(`
    INSERT INTO tokens (id, access_token, refresh_token, expires_at)
    VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at
  `);
  stmt.run(accessToken, refreshToken, expiresAt);
}

export interface FoodRow {
  id: number;
  canonical_name: string;
  display_name: string;
  fitbit_food_id: number;
  default_unit_id: number;
  default_amount: number;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  created_at: number;
}

export function getAllFoods(): FoodRow[] {
  const stmt = db.prepare('SELECT * FROM foods ORDER BY created_at DESC');
  return stmt.all() as FoodRow[];
}

export function getFoodByCanonicalName(canonicalName: string): FoodRow | null {
  const stmt = db.prepare('SELECT * FROM foods WHERE canonical_name = ?');
  return stmt.get(canonicalName) as FoodRow | null;
}

export function insertFood(food: {
  canonical_name: string;
  display_name: string;
  fitbit_food_id: number;
  default_unit_id: number;
  default_amount: number;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}) {
  const stmt = db.prepare(`
    INSERT INTO foods (
      canonical_name, display_name, fitbit_food_id,
      default_unit_id, default_amount, calories,
      protein_g, carbs_g, fat_g, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    food.canonical_name,
    food.display_name,
    food.fitbit_food_id,
    food.default_unit_id,
    food.default_amount,
    food.calories,
    food.protein_g ?? null,
    food.carbs_g ?? null,
    food.fat_g ?? null,
    Math.floor(Date.now() / 1000)
  );
  return result.lastInsertRowid;
}

export function updateFood(canonicalName: string, food: {
  display_name: string;
  fitbit_food_id: number;
  default_unit_id: number;
  default_amount: number;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}) {
  const stmt = db.prepare(`
    UPDATE foods SET
      display_name = ?,
      fitbit_food_id = ?,
      default_unit_id = ?,
      default_amount = ?,
      calories = ?,
      protein_g = ?,
      carbs_g = ?,
      fat_g = ?
    WHERE canonical_name = ?
  `);
  stmt.run(
    food.display_name,
    food.fitbit_food_id,
    food.default_unit_id,
    food.default_amount,
    food.calories,
    food.protein_g ?? null,
    food.carbs_g ?? null,
    food.fat_g ?? null,
    canonicalName
  );
}

export function getIdempotencyKey(key: string) {
  const stmt = db.prepare('SELECT * FROM idempotency_keys WHERE key = ?');
  return stmt.get(key) as { key: string; request_hash: string; response_json: string; created_at: number } | null;
}

export function saveIdempotencyKey(key: string, requestHash: string, responseJson: string) {
  const stmt = db.prepare(`
    INSERT INTO idempotency_keys (key, request_hash, response_json, created_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(key, requestHash, responseJson, Math.floor(Date.now() / 1000));
}

export function saveLog(date: string, mealTypeId: number, requestJson: string, fitbitResponseJson: string) {
  const stmt = db.prepare(`
    INSERT INTO logs (date, meal_type_id, request_json, fitbit_response_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(date, mealTypeId, requestJson, fitbitResponseJson, Math.floor(Date.now() / 1000));
}

export { db };
