import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

// GET /api/syllabus/progress — list of completed item_keys for this user
router.get("/progress", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT item_key FROM syllabus_progress WHERE user_id = $1",
      [req.userId]
    );
    res.json(result.rows.map((r) => r.item_key));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch syllabus progress" });
  }
});

// POST /api/syllabus/progress  { item_key, completed }
router.post("/progress", async (req, res) => {
  try {
    const { item_key, completed } = req.body;
    if (!item_key) return res.status(400).json({ error: "item_key is required" });

    if (completed) {
      await pool.query(
        `INSERT INTO syllabus_progress (user_id, item_key) VALUES ($1, $2)
         ON CONFLICT (user_id, item_key) DO NOTHING`,
        [req.userId, item_key]
      );
    } else {
      await pool.query(
        "DELETE FROM syllabus_progress WHERE user_id = $1 AND item_key = $2",
        [req.userId, item_key]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update syllabus progress" });
  }
});

export default router;
