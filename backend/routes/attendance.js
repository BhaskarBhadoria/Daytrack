import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

// ---------- Subjects ----------

router.get("/subjects", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM subjects WHERE user_id = $1 ORDER BY name",
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

router.post("/subjects", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
    const result = await pool.query(
      `INSERT INTO subjects (user_id, name) VALUES ($1, $2)
       ON CONFLICT (user_id, name) DO NOTHING RETURNING *`,
      [req.userId, name.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: "You already have a subject with this name" });
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create subject" });
  }
});

router.delete("/subjects/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM subjects WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Subject not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

// ---------- Records ----------

// GET /api/attendance/records?date=YYYY-MM-DD
router.get("/records", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "date is required" });
    const result = await pool.query(
      "SELECT * FROM attendance_records WHERE user_id = $1 AND record_date = $2",
      [req.userId, date]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});

// POST /api/attendance/records  { subject_id, date, status }
router.post("/records", async (req, res) => {
  try {
    const { subject_id, date, status } = req.body;
    if (!subject_id || !date || !status) {
      return res.status(400).json({ error: "subject_id, date, status are required" });
    }
    if (!["present", "absent", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "status must be present, absent, or cancelled" });
    }
    const result = await pool.query(
      `INSERT INTO attendance_records (user_id, subject_id, record_date, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, subject_id, record_date) DO UPDATE SET status = $4
       RETURNING *`,
      [req.userId, subject_id, date, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save attendance record" });
  }
});

// GET /api/attendance/summary — per-subject present/absent/cancelled totals and %
router.get("/summary", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.name,
              COUNT(*) FILTER (WHERE a.status = 'present') AS present,
              COUNT(*) FILTER (WHERE a.status = 'absent') AS absent,
              COUNT(*) FILTER (WHERE a.status = 'cancelled') AS cancelled
       FROM subjects s
       LEFT JOIN attendance_records a ON a.subject_id = s.id AND a.user_id = s.user_id
       WHERE s.user_id = $1
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [req.userId]
    );
    const summary = result.rows.map((r) => {
      const present = parseInt(r.present, 10);
      const absent = parseInt(r.absent, 10);
      const held = present + absent; // cancelled classes don't count against attendance
      return {
        id: r.id,
        name: r.name,
        present,
        absent,
        cancelled: parseInt(r.cancelled, 10),
        percentage: held > 0 ? Math.round((present / held) * 100) : null,
      };
    });
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to build attendance summary" });
  }
});

// ---------- Schedule (which days/hours each subject actually has class) ----------

router.get("/schedule", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM subject_schedule WHERE user_id = $1 ORDER BY day_of_week, start_time",
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

// POST /api/attendance/schedule  { subject_id, day_of_week, start_time, end_time }
router.post("/schedule", async (req, res) => {
  try {
    const { subject_id, day_of_week, start_time, end_time } = req.body;
    if (subject_id === undefined || day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({ error: "subject_id, day_of_week, start_time, end_time are required" });
    }
    const result = await pool.query(
      `INSERT INTO subject_schedule (user_id, subject_id, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, subject_id, day_of_week, start_time, end_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create schedule entry" });
  }
});

router.delete("/schedule/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM subject_schedule WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Schedule entry not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete schedule entry" });
  }
});

export default router;
