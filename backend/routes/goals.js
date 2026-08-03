import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

// GET /api/goals?date=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "date query param is required" });

    const result = await pool.query(
      `SELECT * FROM goals WHERE user_id = $1 AND goal_date = $2 ORDER BY type, created_at`,
      [req.userId, date]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch goals" });
  }
});

// POST /api/goals  { title, category, type, goal_date }
router.post("/", async (req, res) => {
  try {
    const { title, category = "general", type, goal_date } = req.body;
    if (!title || !type || !goal_date) {
      return res.status(400).json({ error: "title, type, goal_date are required" });
    }
    if (!["planned", "same_day"].includes(type)) {
      return res.status(400).json({ error: "type must be 'planned' or 'same_day'" });
    }

    const result = await pool.query(
      `INSERT INTO goals (user_id, goal_date, title, category, type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, goal_date, title, category, type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create goal" });
  }
});

// PATCH /api/goals/:id  { is_completed?, title?, category? }
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_completed, title, category } = req.body;

    const existing = await pool.query("SELECT * FROM goals WHERE id = $1 AND user_id = $2", [
      id,
      req.userId,
    ]);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Goal not found" });

    const current = existing.rows[0];
    const newCompleted = is_completed !== undefined ? is_completed : current.is_completed;
    const newTitle = title !== undefined ? title : current.title;
    const newCategory = category !== undefined ? category : current.category;
    const completedAt = newCompleted ? new Date() : null;

    const result = await pool.query(
      `UPDATE goals SET title = $1, category = $2, is_completed = $3, completed_at = $4
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [newTitle, newCategory, newCompleted, completedAt, id, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update goal" });
  }
});

// DELETE /api/goals/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id", [
      id,
      req.userId,
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Goal not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete goal" });
  }
});

export default router;
