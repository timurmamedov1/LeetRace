import { Router } from 'express';
import { storeUser } from '../middleware/auth';

export const authRouter = Router();

// this is the server half of the oauth2 flow.
// the client (activity iframe) gets an auth code from the discord SDK,
// sends it here, and we exchange it for a real access token.
// has to happen server-side because it needs our client_secret
authRouter.post('/token', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    // swap the temp code for an access token with discord
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

    // now use that token to grab the user's profile from discord.
    // we store this so we can identify them on future requests
    // without them having to send their userId in request bodies
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userData = await userRes.json();

    // build their avatar url from discord's CDN
    const avatarUrl = userData.avatar
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
      : '';

    // save the token -> user mapping so our auth middleware can look them up
    storeUser(data.access_token, {
      discordId: userData.id,
      username: userData.global_name || userData.username,
      avatarUrl,
      leetcodeUsername: null,
    });

    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error('Token exchange error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
