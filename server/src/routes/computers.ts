import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

export const computersRouter = Router();

computersRouter.use(requireAuth);

// List computers in a module.
computersRouter.get("/module/:moduleId", async (req, res) => {
  const { organization_id } = req.user!;
  const result = await pool.query(
    `SELECT * FROM computers
     WHERE organization_id = $1 AND module_id = $2
     ORDER BY rack_position ASC`,
    [organization_id, req.params.moduleId]
  );
  res.json(result.rows);
});

const createComputerSchema = z.object({
  module_id: z.string().uuid(),
  identifier: z.string().min(1).max(100),
  rack_position: z.number().int().default(0),
});

// Add a computer to a rack. Admin only, blocked at the org's plan limit.
computersRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = createComputerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { organization_id } = req.user!;

  const org = await pool.query(
    "SELECT max_computers FROM organizations WHERE id = $1",
    [organization_id]
  );
  const count = await pool.query(
    "SELECT COUNT(*)::int AS count FROM computers WHERE organization_id = $1",
    [organization_id]
  );

  if (count.rows[0].count >= org.rows[0].max_computers) {
    return res.status(403).json({
      error: "Computer limit reached for your plan. Upgrade to add more.",
    });
  }

  const { module_id, identifier, rack_position } = parsed.data;
  const result = await pool.query(
    `INSERT INTO computers (organization_id, module_id, identifier, rack_position)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [organization_id, module_id, identifier, rack_position]
  );

  res.status(201).json(result.rows[0]);
});

const updateStatusSchema = z.object({
  status: z.enum(["good", "needs_maintenance", "emergency"]),
  note: z.string().max(500).optional(),
});

// Update a computer's status. Any authenticated org member (admin or
// technician) can do this - it's the core technician workflow. Every
// change is written to status_logs for the audit trail.
computersRouter.patch("/:id/status", async (req, res) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { organization_id, id: userId } = req.user!;
  const { id: computerId } = req.params;
  const { status: newStatus, note } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query(
      "SELECT status FROM computers WHERE id = $1 AND organization_id = $2 FOR UPDATE",
      [computerId, organization_id]
    );

    if (current.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Computer not found." });
    }

    const oldStatus = current.rows[0].status;

    const updated = await client.query(
      `UPDATE computers
       SET status = $1, last_updated_by = $2
       WHERE id = $3 RETURNING *`,
      [newStatus, userId, computerId]
    );

    await client.query(
      `INSERT INTO status_logs (organization_id, computer_id, old_status, new_status, changed_by, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [organization_id, computerId, oldStatus, newStatus, userId, note ?? null]
    );

    await client.query("COMMIT");
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
