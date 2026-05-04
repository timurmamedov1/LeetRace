import { Request, Response, NextFunction } from 'express';

export interface AuthUser {
  discordId: string;
  username: string;
  avatarUrl: string;
  leetcodeUsername: string | null;
}

// extends express's Request type so we can do req.user in route handlers
// without casting everything to any
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// in-memory store mapping access_token -> user info
// gets populated when someone completes the oauth2 flow (see routes/auth.ts)
// note: this gets wiped on server restart, which forces re-auth. thats fine for now
const tokenStore = new Map<string, AuthUser>();

export function storeUser(accessToken: string, user: AuthUser) {
  tokenStore.set(accessToken, user);
}

// updates the leetcode username for a user. called when they
// set it in the lobby before a game starts
export function setLeetcodeUsername(discordId: string, leetcodeUsername: string) {
  for (const user of tokenStore.values()) {
    if (user.discordId === discordId) {
      user.leetcodeUsername = leetcodeUsername;
    }
  }
}

// middleware that checks for a valid Bearer token on protected routes.
// the token was given to the client during oauth2, and the client sends
// it back on every request so we can identify who they are
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization' });
    return;
  }

  // grab the token from "Bearer <token>"
  const token = header.slice(7);
  const user = tokenStore.get(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = user;
  next();
}
