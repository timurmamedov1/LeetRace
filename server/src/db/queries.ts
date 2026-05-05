import { getDatabase } from './database';
import { GameSession } from '../types';

// saves a finished match and all player results in one transaction.
// also updates per-server user stats (wins, losses, streaks).
// call this once when a round ends, not per-player
export function persistMatchResults(session: GameSession): void {
  const db = getDatabase();

  const insertMatch = db.prepare(`
    INSERT INTO match_history (session_id, channel_id, guild_id, difficulty,
      problem_title, problem_slug, problem_number, time_limit_seconds,
      player_count, started_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertResult = db.prepare(`
    INSERT INTO match_results (match_id, discord_id, guild_id, username,
      rank, completed_at, is_winner)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // upsert user stats. creates the row on first game, updates on subsequent
  const upsertUser = db.prepare(`
    INSERT INTO users (discord_id, guild_id, username, wins, losses, games_played,
      current_streak, best_streak)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(discord_id, guild_id) DO UPDATE SET
      username = excluded.username,
      wins = wins + excluded.wins,
      losses = losses + excluded.losses,
      games_played = games_played + 1,
      current_streak = CASE
        WHEN excluded.wins > 0 THEN current_streak + 1
        ELSE 0
      END,
      best_streak = CASE
        WHEN excluded.wins > 0 AND current_streak + 1 > best_streak
          THEN current_streak + 1
        ELSE best_streak
      END,
      updated_at = datetime('now')
  `);

  // wrap everything in a transaction so its all-or-nothing
  const persist = db.transaction(() => {
    if (!session.problem || !session.startedAt) return;

    const matchInfo = insertMatch.run(
      session.id,
      session.channelId,
      session.guildId,
      session.difficulty,
      session.problem.title,
      session.problem.titleSlug,
      session.problem.frontendQuestionId,
      session.timeLimitSeconds,
      session.players.size,
      session.startedAt,
    );

    const matchId = matchInfo.lastInsertRowid;

    for (const player of session.players.values()) {
      const isWinner = player.rank === 1 ? 1 : 0;
      const didFinish = player.rank !== null;

      insertResult.run(
        matchId,
        player.discordId,
        session.guildId,
        player.username,
        player.rank,
        player.completedAt,
        isWinner,
      );

      upsertUser.run(
        player.discordId,
        session.guildId,
        player.username,
        isWinner,                    // wins (0 or 1)
        didFinish ? 0 : 1,          // losses (DNF counts as a loss)
        isWinner ? 1 : 0,           // current_streak initial value
        isWinner ? 1 : 0,           // best_streak initial value
      );
    }
  });

  persist();
}

export interface LeaderboardEntry {
  discordId: string;
  username: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
}

// top 10 players by wins in a given server
export function getLeaderboard(guildId: string): LeaderboardEntry[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT discord_id, username, wins, losses, games_played,
      current_streak, best_streak
    FROM users
    WHERE guild_id = ?
    ORDER BY wins DESC, best_streak DESC
    LIMIT 10
  `).all(guildId) as any[];

  return rows.map(row => ({
    discordId: row.discord_id,
    username: row.username,
    wins: row.wins,
    losses: row.losses,
    gamesPlayed: row.games_played,
    currentStreak: row.current_streak,
    bestStreak: row.best_streak,
  }));
}

export interface UserStats {
  discordId: string;
  username: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
}

// single player's stats in a given server, null if theyve never played
export function getUserStats(discordId: string, guildId: string): UserStats | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT discord_id, username, wins, losses, games_played,
      current_streak, best_streak
    FROM users
    WHERE discord_id = ? AND guild_id = ?
  `).get(discordId, guildId) as any | undefined;

  if (!row) return null;

  return {
    discordId: row.discord_id,
    username: row.username,
    wins: row.wins,
    losses: row.losses,
    gamesPlayed: row.games_played,
    currentStreak: row.current_streak,
    bestStreak: row.best_streak,
  };
}
