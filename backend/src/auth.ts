import { NextFunction, Request, Response } from 'express';
import { getAsync } from './db.js';
import { hashSessionToken } from './passwords.js';

export type AccountRole = 'admin' | 'artisan' | 'institut';

export interface AuthUser {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AccountRole;
  profilePicture: string | null;
  color: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

const SESSION_COOKIE = 'residentorg_session';

export function getSessionToken(req: Request) {
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie ? decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1)) : null;
}

export function setSessionCookie(res: Response, token: string) {
  const maxAge = 7 * 24 * 60 * 60;
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge: maxAge * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getSessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'Connexion requise.' });
    return;
  }

  try {
    const account = await getAsync(
      `SELECT u.id, u.name, u.firstName, u.lastName, u.email, u.role,
              u.profilePicture, u.color
       FROM sessions s JOIN users u ON u.id = s.userId
       WHERE s.tokenHash = ? AND s.expiresAt > ?`,
      [hashSessionToken(token), new Date().toISOString()]
    ) as AuthUser | undefined;

    if (!account) {
      clearSessionCookie(res);
      res.status(401).json({ error: 'Session expirée.' });
      return;
    }

    req.authUser = account;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: AccountRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Action réservée à un autre type de compte.' });
      return;
    }
    next();
  };
}

