import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

// GET /api/sleep?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: "start and end query params are required" });
    }
    const result = await pool.query(
      `SELECT * FROM sleep_logs WHERE user_id = $1 AND log_date BETWEEN $2 AND $3 ORDER BY log_date`,
      [req.userId, start, end]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sleep logs" });
  }
});

// POST /api/sleep  { log_date, bed_time, wake_time, quality? }
// bed_time / wake_time are full ISO timestamps so overnight sleep is handled correctly.
router.post("/", async (req, res) => {
  try {
    const { log_date, bed_time, wake_time, quality } = req.body;
    if (!log_date || !bed_time || !wake_time) {
      return res.status(400).json({ error: "log_date, bed_time, wake_time are required" });
    }

    const bed = new Date(bed_time);
    const wake = new Date(wake_time);
    const durationMinutes = Math.round((wake - bed) / 60000);
    if (durationMinutes <= 0) {
      return res.status(400).json({ error: "wake_time must be after bed_time" });
    }

    const result = await pool.query(
      `INSERT INTO sleep_logs (user_id, log_date, bed_time, wake_time, duration_minutes, quality)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET bed_time = $3, wake_time = $4, duration_minutes = $5, quality = $6
       RETURNING *`,
      [req.userId, log_date, bed_time, wake_time, durationMinutes, quality ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to log sleep" });
  }
});

export default router;
