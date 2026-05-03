import { randomUUID } from 'crypto';
import { GameSession, PlayerState, Difficulty } from '../types';

// all active sessions keyed by channelId — one game per voice channel
const sessions = new Map<string, GameSession>();

const VALID_TIME_LIMITS = [300, 600, 900, 1200, 1800]; // 5, 10, 15, 20, 30 min

export function createGame(
  channelId: string,
  guildId: string,
  hostId: string,
  hostUsername: string,
  hostAvatarUrl: string,
  difficulty: Difficulty = 'Medium',
  timeLimitSeconds: number = 900,
): GameSession {
  // clean up any existing session in this channel
  sessions.delete(channelId);

  const host: PlayerState = {
    discordId: hostId,
    username: hostUsername,
    avatarUrl: hostAvatarUrl,
    isReady: false,
    completedAt: null,
    rank: null,
  };

  const session: GameSession = {
    id: randomUUID(),
    channelId,
    guildId,
    hostId,
    difficulty,
    timeLimitSeconds,
    state: 'lobby',
    players: new Map([[hostId, host]]),
    problem: null,
    startedAt: null,
  };

  sessions.set(channelId, session);
  return session;
}

export function getGame(channelId: string): GameSession | undefined {
  return sessions.get(channelId);
}

export function joinGame(
  channelId: string,
  discordId: string,
  username: string,
  avatarUrl: string,
): GameSession {
  const session = sessions.get(channelId);
  if (!session) throw new Error('No game found for this channel');
  if (session.state !== 'lobby') throw new Error('Game already in progress');
  if (session.players.has(discordId)) return session;

  session.players.set(discordId, {
    discordId,
    username,
    avatarUrl,
    isReady: false,
    completedAt: null,
    rank: null,
  });

  return session;
}

export function leaveGame(channelId: string, discordId: string): GameSession | null {
  const session = sessions.get(channelId);
  if (!session) return null;

  session.players.delete(discordId);

  // if host left, pass it to the next player or kill the session
  if (discordId === session.hostId) {
    const remaining = Array.from(session.players.keys());
    if (remaining.length === 0) {
      sessions.delete(channelId);
      return null;
    }
    session.hostId = remaining[0];
  }

  return session;
}

export function toggleReady(channelId: string, discordId: string): GameSession {
  const session = sessions.get(channelId);
  if (!session) throw new Error('No game found for this channel');
  if (session.state !== 'lobby') throw new Error('Game already in progress');

  const player = session.players.get(discordId);
  if (!player) throw new Error('Player not in this game');

  player.isReady = !player.isReady;
  return session;
}

export function updateSettings(
  channelId: string,
  hostId: string,
  settings: { difficulty?: Difficulty; timeLimitSeconds?: number },
): GameSession {
  const session = sessions.get(channelId);
  if (!session) throw new Error('No game found for this channel');
  if (session.hostId !== hostId) throw new Error('Only the host can change settings');
  if (session.state !== 'lobby') throw new Error('Cannot change settings during a game');

  if (settings.difficulty) session.difficulty = settings.difficulty;
  if (settings.timeLimitSeconds && VALID_TIME_LIMITS.includes(settings.timeLimitSeconds)) {
    session.timeLimitSeconds = settings.timeLimitSeconds;
  }

  return session;
}

// convert Map<string, PlayerState> -> array for JSON serialization
export function serializeSession(session: GameSession) {
  return {
    ...session,
    players: Array.from(session.players.values()),
  };
}
