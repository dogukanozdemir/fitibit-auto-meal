import { Bindings } from '../index';

export async function getTokens(db: D1Database) {
  const result = await db
    .prepare('SELECT access_token, refresh_token, expires_at FROM tokens WHERE id = 1')
    .first();
  return result as { access_token: string; refresh_token: string; expires_at: number } | null;
}

export async function saveTokens(db: D1Database, accessToken: string, refreshToken: string, expiresIn: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  await db
    .prepare(`
      INSERT INTO tokens (id, access_token, refresh_token, expires_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at
    `)
    .bind(accessToken, refreshToken, expiresAt)
    .run();
}

export async function getAllFoods(db: D1Database) {
  const result = await db.prepare('SELECT * FROM foods ORDER BY created_at DESC').all();
  return result.results;
}

export async function getFoodByCanonicalName(db: D1Database, canonicalName: string) {
  const result = await db
    .prepare('SELECT * FROM foods WHERE canonical_name = ?')
    .bind(canonicalName)
    .first();
  return result;
}

export async function insertFood(db: D1Database, food: {
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
  await db
    .prepare(`
      INSERT INTO foods (
        canonical_name, display_name, fitbit_food_id,
        default_unit_id, default_amount, calories,
        protein_g, carbs_g, fat_g, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
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
    )
    .run();
}

export async function updateFood(db: D1Database, canonicalName: string, food: {
  display_name: string;
  fitbit_food_id: number;
  default_unit_id: number;
  default_amount: number;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}) {
  await db
    .prepare(`
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
    `)
    .bind(
      food.display_name,
      food.fitbit_food_id,
      food.default_unit_id,
      food.default_amount,
      food.calories,
      food.protein_g ?? null,
      food.carbs_g ?? null,
      food.fat_g ?? null,
      canonicalName
    )
    .run();
}

export async function getIdempotencyKey(db: D1Database, key: string) {
  const result = await db
    .prepare('SELECT * FROM idempotency_keys WHERE key = ?')
    .bind(key)
    .first();
  return result as { key: string; request_hash: string; response_json: string; created_at: number } | null;
}

export async function saveIdempotencyKey(db: D1Database, key: string, requestHash: string, responseJson: string) {
  await db
    .prepare(`
      INSERT INTO idempotency_keys (key, request_hash, response_json, created_at)
      VALUES (?, ?, ?, ?)
    `)
    .bind(key, requestHash, responseJson, Math.floor(Date.now() / 1000))
    .run();
}

export async function saveLog(db: D1Database, date: string, mealTypeId: number, requestJson: string, fitbitResponseJson: string) {
  await db
    .prepare(`
      INSERT INTO logs (date, meal_type_id, request_json, fitbit_response_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(date, mealTypeId, requestJson, fitbitResponseJson, Math.floor(Date.now() / 1000))
    .run();
}
