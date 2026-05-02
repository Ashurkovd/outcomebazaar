import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export function signUserJwt(user: AuthUser, secret: string): string {
  const payload: JwtPayload = { sub: user.id, email: user.email };
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function createRequireAuth(secret: string) {
  return function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.header('authorization') ?? req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing Bearer token' });
      return;
    }

    const token = header.slice('Bearer '.length).trim();
    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      req.user = { id: decoded.sub, email: decoded.email };
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

/**
 * Admin shared-secret gate. v1: one secret read from ADMIN_API_KEY at call
 * time (lazy — allows the var to be absent in dev, and any endpoint behind
 * this middleware simply returns 401 instead of crashing at startup).
 * Clients send it as `X-Admin-Key: <value>`. Missing/mismatched → 401.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_API_KEY;
  const provided = req.header('x-admin-key') ?? req.header('X-Admin-Key');
  if (!secret || !provided || provided !== secret) {
    res.status(401).json({ error: 'Admin auth required' });
    return;
  }
  next();
}
