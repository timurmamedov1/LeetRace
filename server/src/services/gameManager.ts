import { randomUUID } from 'crypto';
import { GameSession, PlayerState, Difficulty } from '../types';
import { getRandomProblem, verifyCompletion } from './leetcode';
import { persistMatchResults } from '../db/queries';

// all active sessions keyed by channelId, only one game per voice channel at a time.
// these live in memory only, nothing here touches the db.
// stats/results get persisted to sqlite after a round ends (not here tho)
const sessions = new Map<string, GameSession>();

// track active timers so we can clean em up if a game ends early
const gameTimers = new Map<string, NodeJS.Timeout>();

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
  hostLeetcodeUsername: string | null,
  difficulty: Difficulty = 'Medium',
  timeLimitSeconds: number = 900, // default 15 min
): GameSession {
  // wipe any existing session in this channel
  cleanupTimer(channelId);
  sessions.delete(channelId);

  const host: PlayerState = {
    discordId: hostId,
    username: hostUsername,
    avatarUrl: hostAvatarUrl,
    leetcodeUsername: hostLeetcodeUsername,
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
  leetcodeUsername: string | null,
): GameSession {
  const session = sessions.get(channelId);
  if (!session) throw new Error('No game found for this channel');
  if (session.state !== 'lobby') throw new Error('Game already in progress');
  if (session.players.has(discordId)) return session;

  session.players.set(discordId, {
    discordId,
    username,
    avatarUrl,
    leetcodeUsername,
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

  if (session.players.size === 0) {
    cleanupTimer(channelId);
    sessions.delete(channelId);
    return null;
  }

  // hand off host if the host was the one who left
  if (discordId === session.hostId) {
    session.hostId = Array.from(session.players.keys())[0];
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

// updates a player's leetcode username in the lobby
export function setPlayerLeetcode(
  channelId: string,
  discordId: string,
  leetcodeUsername: string,
): GameSession {
  const session = sessions.get(channelId);
  if (!session) throw new Error('No game found for this channel');

  const player = session.players.get(discordId);
  if (!player) throw new Error('Player not in this game');

  player.leetcodeUsername = leetcodeUsername;
  return session;
}

// kicks off the round, fetches a random problem and starts the timer.
// only the host can call this and at least 2 ppl need to be ready
export async function startGame(channelId: string, hostId: string): Promise<GameSession> {
  const session = sessions.get(channelId);
  if (!session) throw new Error('No game found for this channel');
  if (session.hostId !== hostId) throw new Error('Only the host can start the game');
  if (session.state !== 'lobby') throw new Error('Game already started');

  const readyCount = Array.from(session.players.values()).filter(p => p.isReady).length;
  if (readyCount < 2) throw new Error('Need at least 2 ready players');

  // everyone needs a leetcode username set before we can start
  const missingUsername = Array.from(session.players.values()).find(p => !p.leetcodeUsername);
  if (missingUsername) {
    throw new Error(`${missingUsername.username} hasn't set their LeetCode username`);
  }

  // grab a random problem matching the lobby difficulty
  const problem = await getRandomProblem(session.difficulty);

  session.state = 'active';
  session.problem = problem;
  session.startedAt = Date.now();

  // reset everyone's completion state for the new round
  for (const player of session.players.values()) {
    player.completedAt = null;
    player.rank = null;
  }

  // auto-finish the game when time runs out
  const timer = setTimeout(() => {
    finishGame(channelId);
  }, session.timeLimitSeconds * 1000);
  gameTimers.set(channelId, timer);

  console.log(`Game started in ${channelId}: ${problem.title} (${problem.difficulty})`);
  return session;
}

// checks a player's leetcode profile for an accepted submission on the
// round's problem. if verified, marks them complete and assigns a rank
export async function completeChallenge(
  channelId: string,
  discordId: string,
): Promise<{ session: GameSession; verified: boolean; reason?: string }> {
  const session = sessions.get(channelId);
  if (!session) throw new Error('No game found for this channel');
  if (session.state !== 'active') throw new Error('Game is not active');
  if (!session.problem || !session.startedAt) throw new Error('Game not properly started');

  const player = session.players.get(discordId);
  if (!player) throw new Error('Player not in this game');
  if (player.completedAt) throw new Error('Already marked as complete');
  if (!player.leetcodeUsername) throw new Error('LeetCode username not set');

  // check their leetcode profile for a recent accepted submission
  const result = await verifyCompletion(
    player.leetcodeUsername,
    session.problem.titleSlug,
    session.startedAt,
  );

  if (!result.valid) {
    return { session, verified: false, reason: result.reason };
  }

  player.completedAt = Date.now();

  // figure out what place they got (count how many ppl finished before em)
  const finishedCount = Array.from(session.players.values())
    .filter(p => p.completedAt !== null).length;
  player.rank = finishedCount; // 1 = first, 2 = second, etc

  // if everyone finished, end the game early
  const allDone = Array.from(session.players.values()).every(p => p.completedAt !== null);
  if (allDone) {
    finishGame(channelId);
  }

  return { session, verified: true };
}

// wraps up the round. anyone who didnt finish gets marked as DNF.
// called either by the timer or when everyone completes
export function finishGame(channelId: string): GameSession | null {
  const session = sessions.get(channelId);
  if (!session) return null;
  if (session.state === 'finished') return session;

  session.state = 'finished';
  cleanupTimer(channelId);

  // anyone who didnt complete stays rank=null (DNF)
  console.log(`Game finished in ${channelId}`);

  // save match results and update user stats in sqlite
  try {
    persistMatchResults(session);
  } catch (err) {
    console.error('Failed to persist match results:', err);
  }

  return session;
}

// host can send everyone back to the lobby after results are shown
export function returnToLobby(channelId: string, hostId: string): GameSession {
  const session = sessions.get(channelId);
  if (!session) throw new Error('No game found for this channel');
  if (session.hostId !== hostId) throw new Error('Only the host can return to lobby');
  if (session.state !== 'finished') throw new Error('Game is not finished');

  session.state = 'lobby';
  session.problem = null;
  session.startedAt = null;

  // reset all player states for a fresh round
  for (const player of session.players.values()) {
    player.isReady = false;
    player.completedAt = null;
    player.rank = null;
  }

  return session;
}

// cleans up the auto-finish timer for a channel
function cleanupTimer(channelId: string) {
  const timer = gameTimers.get(channelId);
  if (timer) {
    clearTimeout(timer);
    gameTimers.delete(channelId);
  }
}

// converts the session to something JSON.stringify can handle.
// the players Map becomes a plain array since Maps serialize to "{}"
export function serializeSession(session: GameSession) {
  return {
    ...session,
    players: Array.from(session.players.values()),
  };
}
