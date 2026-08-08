import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

// GET /api/journal?date=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "date is required" });
    const result = await pool.query(
      "SELECT * FROM journal_entries WHERE user_id = $1 AND entry_date = $2",
      [req.userId, date]
    );
    res.json(result.rows[0] || { entry_date: date, content: "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch journal entry" });
  }
});

// GET /api/journal/recent — last 10 entries with content, most recent first
router.get("/recent", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT entry_date, content FROM journal_entries
       WHERE user_id = $1 AND content != '' ORDER BY entry_date DESC LIMIT 10`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recent journal entries" });
  }
});

// PUT /api/journal  { date, content }
router.put("/", async (req, res) => {
  try {
    const { date, content } = req.body;
    if (!date) return res.status(400).json({ error: "date is required" });
    const result = await pool.query(
      `INSERT INTO journal_entries (user_id, entry_date, content, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, entry_date) DO UPDATE SET content = $3, updated_at = NOW()
       RETURNING *`,
      [req.userId, date, content || ""]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save journal entry" });
  }
});

export default router;
