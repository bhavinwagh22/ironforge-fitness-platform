const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Support process.env.DATABASE_PATH for deployment (Render persistent disk).
// Keep the current server/gym.db path as the local development default.
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'gym.db');

// Create the parent directory if needed (e.g., for /data on Render)
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Do not silently create a fresh production database if the expected
// persistent database file is missing. In production, warn loudly.
if (process.env.NODE_ENV === 'production' && !fs.existsSync(DB_PATH)) {
  console.error(`[DB] FATAL: Expected database file not found at ${DB_PATH}`);
  console.error('[DB] Refusing to create a fresh database in production.');
  process.exit(1);
}

const db = new Database(DB_PATH);
console.log(`[DB] Connected to: ${DB_PATH}`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
console.log(`[DB] Users table initialized. Total users: ${userCount}`);

db.exec(`
  CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_name TEXT NOT NULL,
    category TEXT NOT NULL,
    serving_size REAL NOT NULL,
    serving_unit TEXT NOT NULL,
    raw_or_cooked TEXT NOT NULL,
    calories REAL, protein REAL, carbohydrates REAL, total_fat REAL, dietary_fiber REAL,
    sugar REAL, saturated_fat REAL, sodium REAL, potassium REAL, calcium REAL, iron REAL,
    vitamin_c REAL, vitamin_a REAL, data_source TEXT NOT NULL, source_reference_id TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS food_analysis_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    analysis_date TEXT NOT NULL,
    items_json TEXT NOT NULL,
    totals_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS nutrition_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    calorie_target REAL,
    protein_target REAL,
    carbs_target REAL,
    fat_target REAL,
    fiber_target REAL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

module.exports = { db, DB_PATH };