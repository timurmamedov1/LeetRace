// load .env from repo root (one dir up from server/)
// has to happen before any other imports that use process.env
import path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { gameRouter } from './routes/game';
import { startBot } from './bot';

const app = express();
app.use(cors());
app.use(express.json());

// mount route groups
app.use('/api/auth', authRouter);  // oauth2 token exchange
app.use('/api/game', gameRouter);  // lobby/game state management

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// companion bot runs in the same process for simplicity.
// if bot token is missing it just logs a warning and skips
startBot().catch((err) => {
  console.error('Failed to start bot:', err);
});
