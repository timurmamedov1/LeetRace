import { randomUUID } from 'crypto';
import { GameSession, PlayerState, Difficulty } from '../types';

// all active sessions keyed by channelId — only one game per voice channel at a time.
// these live in memory only, nothing here touches the db.
// stats/results get persisted to sqlite after a round ends (not here tho)
const sessions = new Map<string, GameSession>();

// the allowed time limits in seconds (5, 10, 15, 20, 30 min)
const VALID_TIME_LIMITS = [300, 600, 900, 1200, 1800];

// creates a new lobby session. the person who calls this becomes host.
// if theres already a session in this channel it gets replaced
export function createGame(
  channelId: string,
  guildId: string,
  hostId: string,
  hostUsername: string,
  hostAvatarUrl: string,
  difficulty: Difficulty = 'Medium',
  timeLimitSeconds: number = 900, // default 15 min
): GameSession {
  // wipe any existing session in this channel
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

// adds a player to the lobby. if they're already in, just returns the session
// (makes it safe to call multiple times without worrying about dupes)
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

// removes a player from the game. if the host leaves, ownership
// passes to whoever joined next. if everyones gone, session gets deleted
export function leaveGame(channelId: string, discordId: string): GameSession | null {
  const session = sessions.get(channelId);
  if (!session) return null;

  session.players.delete(discordId);

  if (discordId === session.hostId) {
    const remaining = Array.from(session.players.keys());
    if (remaining.length === 0) {
      // nobody left, clean up
      sessions.delete(channelId);
      return null;
    }
    // hand off host to next person
    session.hostId = remaining[0];
  }

  return session;
}

// flips a players ready state on/off
export function toggleReady(channelId: string, discordId: string): GameSession {
  const session = sessions.get(channelId);
  if (!session) throw new Error('No game found for this channel');
  if (session.state !== 'lobby') throw new Error('Game already in progress');

  const player = session.players.get(discordId);
  if (!player) throw new Error('Player not in this game');

  player.isReady = !player.isReady;
  return session;
}

// lets the host change difficulty and/or time limit before starting
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

// converts the session to something JSON.stringify can handle.
// the players Map becomes a plain array since Maps serialize to "{}"
export function serializeSession(session: GameSession) {
  return {
    ...session,
    players: Array.from(session.players.values()),
  };
}
