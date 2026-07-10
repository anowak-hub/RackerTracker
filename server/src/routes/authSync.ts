import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { pool } from "../db/pool.js";

export const authSyncRouter = Router();

/**
 * Call this once right after a user signs in (or on app load if no local
 * user exists yet). It reads the caller's identity from their verified
 * Clerk session, then upserts matching rows in our own `organizations`
 * and `users` tables.
 *
 * First member of a Clerk organization becomes a local admin; everyone
 * else joins as a technician. Adjust this rule if you want Clerk's own
 * org roles (admin/member) to drive it instead - see the TODO below.
 */
authSyncRouter.post("/sync", async (req, res) => {
  const { userId: clerkUserId, orgId: clerkOrgId } = getAuth(req);

  if (!clerkUserId) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  if (!clerkOrgId) {
    return res.status(400).json({
      error: "No active organization selected in Clerk. Create or select one first.",
    });
  }

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const clerkOrg = await clerkClient.organizations.getOrganization({ organizationId: clerkOrgId });
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Upsert the organization.
    let orgResult = await client.query(
      `SELECT * FROM organizations WHERE clerk_org_id = $1`,
      [clerkOrgId]
    );

    if (orgResult.rows.length === 0) {
      orgResult = await client.query(
        `INSERT INTO organizations (clerk_org_id, name)
         VALUES ($1, $2) RETURNING *`,
        [clerkOrgId, clerkOrg.name]
      );
    }
    const organization = orgResult.rows[0];

    // Upsert the user. TODO: once you're pulling Clerk's own membership
    // role (admin/member) via clerkClient.organizations.getOrganizationMembershipList,
    // map that to our role instead of "first user wins admin".
    let userResult = await client.query(
      `SELECT * FROM users WHERE clerk_user_id = $1`,
      [clerkUserId]
    );

    if (userResult.rows.length === 0) {
      const memberCount = await client.query(
        `SELECT COUNT(*)::int AS count FROM users WHERE organization_id = $1`,
        [organization.id]
      );
      const role = memberCount.rows[0].count === 0 ? "admin" : "technician";

      userResult = await client.query(
        `INSERT INTO users (clerk_user_id, organization_id, email, role)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [clerkUserId, organization.id, email, role]
      );
    }

    await client.query("COMMIT");
    res.json({ organization, user: userResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});