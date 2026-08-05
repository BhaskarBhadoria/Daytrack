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

// ---------- Custom syllabus subjects & topics ----------

// GET /api/syllabus/custom — user's added subjects and topics, merged client-side into the base syllabus
router.get("/custom", async (req, res) => {
  try {
    const [subjects, topics] = await Promise.all([
      pool.query("SELECT * FROM custom_syllabus_subjects WHERE user_id = $1 ORDER BY name", [req.userId]),
      pool.query("SELECT * FROM custom_syllabus_topics WHERE user_id = $1 ORDER BY created_at", [req.userId]),
    ]);
    res.json({ subjects: subjects.rows, topics: topics.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch custom syllabus data" });
  }
});

// POST /api/syllabus/custom/subjects  { subject_key, name }
router.post("/custom/subjects", async (req, res) => {
  try {
    const { subject_key, name } = req.body;
    if (!subject_key || !name) return res.status(400).json({ error: "subject_key and name are required" });
    const result = await pool.query(
      `INSERT INTO custom_syllabus_subjects (user_id, subject_key, name) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, subject_key) DO NOTHING RETURNING *`,
      [req.userId, subject_key, name]
    );
    if (result.rows.length === 0) return res.status(409).json({ error: "That subject already exists" });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create custom subject" });
  }
});

// DELETE /api/syllabus/custom/subjects/:subject_key — also removes its custom topics
router.delete("/custom/subjects/:subject_key", async (req, res) => {
  try {
    await pool.query("DELETE FROM custom_syllabus_topics WHERE user_id = $1 AND subject_key = $2", [
      req.userId,
      req.params.subject_key,
    ]);
    await pool.query("DELETE FROM custom_syllabus_subjects WHERE user_id = $1 AND subject_key = $2", [
      req.userId,
      req.params.subject_key,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete custom subject" });
  }
});

// POST /api/syllabus/custom/topics  { subject_key, title }
router.post("/custom/topics", async (req, res) => {
  try {
    const { subject_key, title } = req.body;
    if (!subject_key || !title) return res.status(400).json({ error: "subject_key and title are required" });
    const result = await pool.query(
      `INSERT INTO custom_syllabus_topics (user_id, subject_key, title) VALUES ($1, $2, $3) RETURNING *`,
      [req.userId, subject_key, title]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create custom topic" });
  }
});

// DELETE /api/syllabus/custom/topics/:id
router.delete("/custom/topics/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM custom_syllabus_topics WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Topic not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete custom topic" });
  }
});

export default router;
