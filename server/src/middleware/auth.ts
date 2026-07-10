import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { pool } from "../db/pool.js";

/**
 * Requires a valid Clerk session AND a matching local `users` row.
 *
 * Clerk owns authentication (who is this person, are they signed in);
 * our own `users`/`organizations` tables own authorization data specific
 * to RackerTracker (role, plan tier, module/computer limits). This
 * middleware bridges the two: it trusts Clerk's verified session to get
 * a `clerk_user_id`, then looks up the local record so downstream routes
 * get `req.user.organization_id` and `req.user.role` for free.
 *
 * If no local user is found, the client hasn't called POST /api/auth/sync
 * yet (normally done once right after sign-in) - respond with a distinct
 * error code so the frontend knows to trigger that instead of just retrying.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId: clerkUserId } = getAuth(req);

  if (!clerkUserId) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const result = await pool.query(
    `SELECT id, organization_id, email, role FROM users WHERE clerk_user_id = $1`,
    [clerkUserId]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({
      error: "No local account for this session.",
      code: "SYNC_REQUIRED",
    });
  }

  req.user = result.rows[0];
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