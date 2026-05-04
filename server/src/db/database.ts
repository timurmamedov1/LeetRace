import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// singleton. one connection shared across the whole server
let db: Database.Database | null = null;

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

  // run the schema. all statements use IF NOT EXISTS so this is
  // safe to call on every startup
  const schema = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf-8',
  );
  db.exec(schema);

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
