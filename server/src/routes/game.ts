import { Router } from 'express';
import { requireAuth, setLeetcodeUsername } from '../middleware/auth';
import * as gameManager from '../services/gameManager';

export const gameRouter = Router();

// all game routes need auth. user identity comes from the token,
// not from request bodies (prevents impersonation)
gameRouter.use(requireAuth);

// get current game state for a channel
// the client polls this every ~1.5s to stay in sync
gameRouter.get('/:channelId', (req, res) => {
  const session = gameManager.getGame(req.params.channelId);
  if (!session) {
    res.status(404).json({ error: 'No game found' });
    return;
  }
  res.json(gameManager.serializeSession(session));
});

// create a new lobby, whoever calls this becomes the host
gameRouter.post('/create', (req, res) => {
  const { channelId, guildId, difficulty, timeLimitSeconds } = req.body;
  const user = req.user!;

  try {
    const session = gameManager.createGame(
      channelId, guildId,
      user.discordId, user.username, user.avatarUrl,
      user.leetcodeUsername,
      difficulty, timeLimitSeconds,
    );
    res.json(gameManager.serializeSession(session));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// join an existing lobby. idempotent, safe to call if already in
gameRouter.post('/:channelId/join', (req, res) => {
  const user = req.user!;
  try {
    const session = gameManager.joinGame(
      req.params.channelId,
      user.discordId, user.username, user.avatarUrl,
      user.leetcodeUsername,
    );
    res.json(gameManager.serializeSession(session));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// toggle ready status on/off
gameRouter.post('/:channelId/ready', (req, res) => {
  const user = req.user!;
  try {
    const session = gameManager.toggleReady(req.params.channelId, user.discordId);
    res.json(gameManager.serializeSession(session));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// leave the lobby. if the host leaves, ownership transfers to next player
gameRouter.post('/:channelId/leave', (req, res) => {
  const user = req.user!;
  const session = gameManager.leaveGame(req.params.channelId, user.discordId);
  res.json(session ? gameManager.serializeSession(session) : { left: true });
});

// change difficulty or time limit (host only)
gameRouter.post('/:channelId/settings', (req, res) => {
  const user = req.user!;
  const { difficulty, timeLimitSeconds } = req.body;
  try {
    const session = gameManager.updateSettings(
      req.params.channelId, user.discordId,
      { difficulty, timeLimitSeconds },
    );
    res.json(gameManager.serializeSession(session));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// set the player's leetcode username. stored on both the auth user
// (persists across games) and the current game session
gameRouter.post('/:channelId/leetcode-username', (req, res) => {
  const user = req.user!;
  const { leetcodeUsername } = req.body;

  if (!leetcodeUsername || typeof leetcodeUsername !== 'string') {
    res.status(400).json({ error: 'Missing LeetCode username' });
    return;
  }

  const trimmed = leetcodeUsername.trim();

  try {
    // persist on the auth user so it carries across games
    setLeetcodeUsername(user.discordId, trimmed);

    // also update the current game session
    const session = gameManager.setPlayerLeetcode(
      req.params.channelId, user.discordId, trimmed,
    );
    res.json(gameManager.serializeSession(session));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// host starts the round. fetches a problem and kicks off the timer
gameRouter.post('/:channelId/start', async (req, res) => {
  const user = req.user!;
  try {
    const session = await gameManager.startGame(req.params.channelId, user.discordId);
    res.json(gameManager.serializeSession(session));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// player claims they solved it. server checks their leetcode profile
// for a recent accepted submission on the problem
gameRouter.post('/:channelId/complete', async (req, res) => {
  const user = req.user!;

  try {
    const { session, verified, reason } = await gameManager.completeChallenge(
      req.params.channelId, user.discordId,
    );

    if (!verified) {
      res.status(400).json({ error: reason || 'Verification failed', verified: false });
      return;
    }

    res.json({ ...gameManager.serializeSession(session), verified: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// host sends everyone back to the lobby for another round
gameRouter.post('/:channelId/lobby', (req, res) => {
  const user = req.user!;
  try {
    const session = gameManager.returnToLobby(req.params.channelId, user.discordId);
    res.json(gameManager.serializeSession(session));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});
