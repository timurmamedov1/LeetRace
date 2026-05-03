// load .env from repo root (one dir up from server/)
import path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { startBot } from './bot';

const app = express();
app.use(cors());
app.use(express.json());

// routes
app.use('/api/auth', authRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// bot runs in same process, fails gracefully if creds are missing
startBot().catch((err) => {
  console.error('Failed to start bot:', err);
});
