import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

// GET /api/export — a full JSON dump of everything this user has stored.
router.get("/", async (req, res) => {
  try {
    const uid = req.userId;
    const [goals, sleep, timetable, subjects, attendance, syllabusProgress, customSubjects, customTopics] =
      await Promise.all([
        pool.query("SELECT * FROM goals WHERE user_id = $1 ORDER BY goal_date", [uid]),
        pool.query("SELECT * FROM sleep_logs WHERE user_id = $1 ORDER BY log_date", [uid]),
        pool.query("SELECT * FROM timetable_slots WHERE user_id = $1", [uid]),
        pool.query("SELECT * FROM subjects WHERE user_id = $1", [uid]),
        pool.query("SELECT * FROM attendance_records WHERE user_id = $1", [uid]),
        pool.query("SELECT item_key, completed_at FROM syllabus_progress WHERE user_id = $1", [uid]),
        pool.query("SELECT * FROM custom_syllabus_subjects WHERE user_id = $1", [uid]),
        pool.query("SELECT * FROM custom_syllabus_topics WHERE user_id = $1", [uid]),
      ]);

    res.setHeader("Content-Disposition", `attachment; filename="daytrack-export-${Date.now()}.json"`);
    res.json({
      exported_at: new Date().toISOString(),
      goals: goals.rows,
      sleep_logs: sleep.rows,
      timetable_slots: timetable.rows,
      subjects: subjects.rows,
      attendance_records: attendance.rows,
      syllabus_progress: syllabusProgress.rows,
      custom_syllabus_subjects: customSubjects.rows,
      custom_syllabus_topics: customTopics.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to export data" });
  }
});

export default router;
