import { Router } from 'express';
import { storeUser } from '../middleware/auth';

export const authRouter = Router();

// exchange discord oauth2 code for an access token
// client gets the code from the SDK, sends it here, we swap it
// server-side because it needs the client_secret
authRouter.post('/token', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_APP_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: 'Token exchange failed', details: data });
      return;
    }

    // fetch the user's profile so we can identify them on future requests
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userData = await userRes.json();

    const avatarUrl = userData.avatar
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
      : '';

    storeUser(data.access_token, {
      discordId: userData.id,
      username: userData.global_name || userData.username,
      avatarUrl,
    });

    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error('Token exchange error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
