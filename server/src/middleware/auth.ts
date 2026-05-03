import { Request, Response, NextFunction } from 'express';

export interface AuthUser {
  discordId: string;
  username: string;
  avatarUrl: string;
}

// extends express Request so req.user is available in route handlers
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// populated during oauth2 token exchange, maps access_token -> user info
const tokenStore = new Map<string, AuthUser>();

export function storeUser(accessToken: string, user: AuthUser) {
  tokenStore.set(accessToken, user);
}

// pulls user identity from the Bearer token, rejects if missing/invalid
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization' });
    return;
  }

  const token = header.slice(7);
  const user = tokenStore.get(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = user;
  next();
}
