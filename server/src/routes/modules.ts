import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

export const modulesRouter = Router();

modulesRouter.use(requireAuth);

// List all modules for the caller's organization.
modulesRouter.get("/", async (req, res) => {
  const { organization_id } = req.user!;
  const result = await pool.query(
    "SELECT * FROM modules WHERE organization_id = $1 ORDER BY created_at ASC",
    [organization_id]
  );
  res.json(result.rows);
});

const createModuleSchema = z.object({
  name: z.string().min(1).max(100),
  position_x: z.number().int().default(0),
  position_y: z.number().int().default(0),
});

// Create a module. Admin only, and blocked once the org hits its plan limit.
modulesRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = createModuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { organization_id, id: userId } = req.user!;

  const org = await pool.query(
    "SELECT max_modules FROM organizations WHERE id = $1",
    [organization_id]
  );
  const count = await pool.query(
    "SELECT COUNT(*)::int AS count FROM modules WHERE organization_id = $1",
    [organization_id]
  );

  if (count.rows[0].count >= org.rows[0].max_modules) {
    return res.status(403).json({
      error: "Module limit reached for your plan. Upgrade to add more.",
    });
  }

  const { name, position_x, position_y } = parsed.data;
  const result = await pool.query(
    `INSERT INTO modules (organization_id, name, position_x, position_y, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [organization_id, name, position_x, position_y, userId]
  );

  res.status(201).json(result.rows[0]);
});
