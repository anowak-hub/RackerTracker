import type { Request, Response, NextFunction } from "express";

/**
 * Placeholder auth middleware. Currently just checks that a user was
 * attached upstream (e.g. by a future JWT-verification step) and rejects
 * the request otherwise. Every route that touches org-scoped data should
 * sit behind this so `req.user.organization_id` is always available.
 *
 * TODO: replace with real JWT verification (or an auth provider like
 * Clerk/Auth0/Supabase Auth) before this goes anywhere near production.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  next();
}

/**
 * Restricts a route to admins only. Must run after requireAuth.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}
