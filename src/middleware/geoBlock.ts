import { Request, Response, NextFunction } from 'express';

/**
 * Countries we cannot serve. Read from `cf-ipcountry` (Cloudflare adds this
 * automatically when proxying). In dev / non-CF environments the header is
 * absent and requests are allowed through.
 *
 * Empty set at launch — re-populate (e.g. `['US', 'GB', 'FR', 'SG', 'AE', 'CA']`)
 * once we're ready to enforce geographic restrictions. Leaving the middleware
 * mounted so flipping it on is a one-line change.
 */
const BLOCKED_COUNTRIES = new Set<string>();

/** Paths exempt from geo-blocking. Health checks must always succeed for
 * monitoring; admin endpoints use a shared secret rather than IP location. */
const EXEMPT_PREFIXES = ['/api/health', '/api/admin'];

export function geoBlock(req: Request, res: Response, next: NextFunction): void {
  if (EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }

  const country = (req.header('cf-ipcountry') || '').toUpperCase().slice(0, 2);
  if (country && BLOCKED_COUNTRIES.has(country)) {
    res.status(451).json({
      error: 'Service unavailable in your region',
      country,
    });
    return;
  }

  next();
}
