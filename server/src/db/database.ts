import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// singleton. one connection shared across the whole server
let db: Database.Database | null = null;

// inlined here bc tsc doesnt copy .sql files to dist/,
// which breaks production builds
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  username TEXT NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(discord_id, guild_id)
);

CREATE TABLE IF NOT EXISTS match_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  problem_title TEXT NOT NULL,
  problem_slug TEXT NOT NULL,
  problem_number TEXT NOT NULL,
  time_limit_seconds INTEGER NOT NULL,
  player_count INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS match_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES match_history(id),
  discord_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  username TEXT NOT NULL,
  rank INTEGER,
  completed_at INTEGER,
  is_winner INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_guild ON users(guild_id);
CREATE INDEX IF NOT EXISTS idx_users_lookup ON users(discord_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_match_history_guild ON match_history(guild_id);
CREATE INDEX IF NOT EXISTS idx_match_results_match ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_player ON match_results(discord_id, guild_id);
`;

// opens the db and runs schema if needed. sqlite file lives at the repo
// root so it doesnt get wiped by server rebuilds
export function initDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.resolve(__dirname, '../../../data/leetrace.db');
  const dbDir = path.dirname(dbPath);

  // make sure the data/ folder exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);

  // wal mode for better concurrent read performance during polling
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // all statements use IF NOT EXISTS so this is safe to call on every startup
  db.exec(SCHEMA);

  console.log('SQLite database initialized');
  return db;
}

// grab the db instance. throws if init hasnt been called yet
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. call initDatabase() first');
  }
  return db;
}
