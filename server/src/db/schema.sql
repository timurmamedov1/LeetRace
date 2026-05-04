-- per-server user stats. one row per user per guild so leaderboards
-- are scoped to individual discord servers
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

-- one row per completed round. stores the metadata about what was played
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

-- per-player outcome for each match. links back to match_history
CREATE TABLE IF NOT EXISTS match_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES match_history(id),
  discord_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  username TEXT NOT NULL,
  rank INTEGER,              -- null = DNF
  completed_at INTEGER,      -- unix ts, null if they didnt finish
  is_winner INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- indexes for the queries we'll actually run
CREATE INDEX IF NOT EXISTS idx_users_guild ON users(guild_id);
CREATE INDEX IF NOT EXISTS idx_users_lookup ON users(discord_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_match_history_guild ON match_history(guild_id);
CREATE INDEX IF NOT EXISTS idx_match_results_match ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_player ON match_results(discord_id, guild_id);
