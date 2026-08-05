import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

// GET /api/timetable — all recurring slots, sorted by day then start time
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM timetable_slots WHERE user_id = $1 ORDER BY day_of_week NULLS FIRST, start_time",
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch timetable" });
  }
});

// POST /api/timetable  { title, category, start_time, end_time, day_of_week }
// day_of_week: 0-6 (0=Sunday) for a specific day, or null/omitted for "every day".
router.post("/", async (req, res) => {
  try {
    const { title, category = "general", start_time, end_time, day_of_week = null } = req.body;
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: "title, start_time, end_time are required" });
    }
    const result = await pool.query(
      `INSERT INTO timetable_slots (user_id, title, category, start_time, end_time, day_of_week)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.userId, title, category, start_time, end_time, day_of_week]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create timetable slot" });
  }
});

// PATCH /api/timetable/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(
      "SELECT * FROM timetable_slots WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: "Slot not found" });

    const current = existing.rows[0];
    const { title, category, start_time, end_time, day_of_week } = req.body;
    const result = await pool.query(
      `UPDATE timetable_slots SET title = $1, category = $2, start_time = $3, end_time = $4, day_of_week = $5
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [
        title ?? current.title,
        category ?? current.category,
        start_time ?? current.start_time,
        end_time ?? current.end_time,
        day_of_week !== undefined ? day_of_week : current.day_of_week,
        id,
        req.userId,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update timetable slot" });
  }
});

// DELETE /api/timetable/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM timetable_slots WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Slot not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete timetable slot" });
  }
});

export default router;
