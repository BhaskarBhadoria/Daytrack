import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

// GET /api/reports/weekly?start=YYYY-MM-DD  (start = Monday of the week)
router.get("/weekly", async (req, res) => {
  try {
    const { start } = req.query;
    if (!start) return res.status(400).json({ error: "start query param is required" });

    const startDate = new Date(start);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const end = endDate.toISOString().slice(0, 10);

    const goalsResult = await pool.query(
      `SELECT goal_date, type, is_completed, COUNT(*) as count
       FROM goals WHERE user_id = $1 AND goal_date BETWEEN $2 AND $3
       GROUP BY goal_date, type, is_completed
       ORDER BY goal_date`,
      [req.userId, start, end]
    );

    const sleepResult = await pool.query(
      `SELECT log_date, duration_minutes, quality FROM sleep_logs
       WHERE user_id = $1 AND log_date BETWEEN $2 AND $3 ORDER BY log_date`,
      [req.userId, start, end]
    );

    // Build a per-day summary
    const dayMap = {};
    for (const row of goalsResult.rows) {
      const d = row.goal_date.toISOString().slice(0, 10);
      if (!dayMap[d]) dayMap[d] = { date: d, planned: 0, planned_done: 0, same_day: 0, same_day_done: 0 };
      const count = parseInt(row.count, 10);
      if (row.type === "planned") {
        dayMap[d].planned += count;
        if (row.is_completed) dayMap[d].planned_done += count;
      } else {
        dayMap[d].same_day += count;
        if (row.is_completed) dayMap[d].same_day_done += count;
      }
    }

    const sleepAvgMinutes =
      sleepResult.rows.length > 0
        ? Math.round(
            sleepResult.rows.reduce((sum, r) => sum + r.duration_minutes, 0) / sleepResult.rows.length
          )
        : null;

    const totalGoals = Object.values(dayMap).reduce((s, d) => s + d.planned + d.same_day, 0);
    const totalDone = Object.values(dayMap).reduce((s, d) => s + d.planned_done + d.same_day_done, 0);

    res.json({
      week_start: start,
      week_end: end,
      days: Object.values(dayMap),
      sleep: sleepResult.rows.map((r) => ({
        date: r.log_date.toISOString().slice(0, 10),
        duration_minutes: r.duration_minutes,
        quality: r.quality,
      })),
      summary: {
        total_goals: totalGoals,
        total_completed: totalDone,
        completion_rate: totalGoals > 0 ? Math.round((totalDone / totalGoals) * 100) : 0,
        avg_sleep_minutes: sleepAvgMinutes,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to build weekly report" });
  }
});

export default router;
