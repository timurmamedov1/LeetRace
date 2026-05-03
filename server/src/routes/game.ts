import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as gameManager from '../services/gameManager';

export const gameRouter = Router();
gameRouter.use(requireAuth);

// get current game state for a channel
gameRouter.get('/:channelId', (req, res) => {
  const session = gameManager.getGame(req.params.channelId);
  if (!session) {
    res.status(404).json({ error: 'No game found' });
    return;
  }
  res.json(gameManager.serializeSession(session));
});

// create a new lobby (caller becomes host)
gameRouter.post('/create', (req, res) => {
  const { channelId, guildId, difficulty, timeLimitSeconds } = req.body;
  const user = req.user!;

  try {
    const session = gameManager.createGame(
      channelId, guildId,
      user.discordId, user.username, user.avatarUrl,
      difficulty, timeLimitSeconds,
    );
    res.json(gameManager.serializeSession(session));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// join an existing lobby
gameRouter.post('/:channelId/join', (req, res) => {
  const user = req.user!;
  try {
    const session = gameManager.joinGame(
      req.params.channelId,
      user.discordId, user.username, user.avatarUrl,
    );
    res.json(gameManager.serializeSession(session));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// toggle ready state
gameRouter.post('/:channelId/ready', (req, res) => {
  const user = req.user!;
  try {
    const session = gameManager.toggleReady(req.params.channelId, user.discordId);
    res.json(gameManager.serializeSession(session));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// leave the lobby
gameRouter.post('/:channelId/leave', (req, res) => {
  const user = req.user!;
  const session = gameManager.leaveGame(req.params.channelId, user.discordId);
  res.json(session ? gameManager.serializeSession(session) : { left: true });
});

// update difficulty / time limit (host only)
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
