import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

// GET /api/settings — fetch reminder settings, creating defaults if none exist yet
router.get("/", async (req, res) => {
  try {
    const existing = await pool.query("SELECT * FROM reminder_settings WHERE user_id = $1", [
      req.userId,
    ]);
    if (existing.rows.length > 0) return res.json(existing.rows[0]);

    const created = await pool.query(
      "INSERT INTO reminder_settings (user_id) VALUES ($1) RETURNING *",
      [req.userId]
    );
    res.json(created.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// PUT /api/settings  { plan_reminder_enabled, plan_reminder_time, sleep_reminder_enabled, sleep_reminder_time }
router.put("/", async (req, res) => {
  try {
    const {
      plan_reminder_enabled = false,
      plan_reminder_time = "21:00",
      sleep_reminder_enabled = false,
      sleep_reminder_time = "07:00",
    } = req.body;

    const result = await pool.query(
      `INSERT INTO reminder_settings (user_id, plan_reminder_enabled, plan_reminder_time, sleep_reminder_enabled, sleep_reminder_time, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         plan_reminder_enabled = $2, plan_reminder_time = $3,
         sleep_reminder_enabled = $4, sleep_reminder_time = $5, updated_at = NOW()
       RETURNING *`,
      [req.userId, plan_reminder_enabled, plan_reminder_time, sleep_reminder_enabled, sleep_reminder_time]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
