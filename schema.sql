CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

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
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  meal_type_id INTEGER NOT NULL,
  request_json TEXT NOT NULL,
  fitbit_response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_foods_canonical_name ON foods(canonical_name);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
