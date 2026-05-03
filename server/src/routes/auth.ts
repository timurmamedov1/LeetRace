import { Router } from 'express';

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

    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error('Token exchange error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
