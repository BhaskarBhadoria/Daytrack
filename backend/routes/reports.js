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

// GET /api/reports/streak — current & longest streak of days with at least one completed goal
router.get("/streak", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT goal_date FROM goals WHERE user_id = $1 AND is_completed = true ORDER BY goal_date ASC`,
      [req.userId]
    );
    const dates = result.rows.map((r) => r.goal_date.toISOString().slice(0, 10));
    const dateSet = new Set(dates);

    // Longest streak: scan chronologically for consecutive runs.
    let longest = 0;
    let run = 0;
    let prev = null;
    for (const d of dates) {
      const cur = new Date(d);
      if (prev) {
        const diffDays = Math.round((cur - prev) / 86400000);
        run = diffDays === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      longest = Math.max(longest, run);
      prev = cur;
    }

    // Current streak: walk backward from today (or yesterday, so an unfinished
    // "today" doesn't zero out an otherwise-live streak).
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    let cursor = dateSet.has(todayStr) ? today : new Date(today.getTime() - 86400000);
    let current = 0;
    while (dateSet.has(cursor.toISOString().slice(0, 10))) {
      current += 1;
      cursor = new Date(cursor.getTime() - 86400000);
    }

    res.json({ current_streak: current, longest_streak: longest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute streak" });
  }
});

// GET /api/reports/monthly?month=YYYY-MM
router.get("/monthly", async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: "month query param (YYYY-MM) is required" });

    const result = await pool.query(
      `SELECT goal_date,
              COUNT(*) as total,
              SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed
       FROM goals
       WHERE user_id = $1 AND to_char(goal_date, 'YYYY-MM') = $2
       GROUP BY goal_date
       ORDER BY goal_date`,
      [req.userId, month]
    );

    const days = result.rows.map((r) => ({
      date: r.goal_date.toISOString().slice(0, 10),
      total: parseInt(r.total, 10),
      completed: parseInt(r.completed, 10),
    }));

    res.json({ month, days });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to build monthly view" });
  }
});

// GET /api/reports/categories?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/categories", async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: "start and end are required" });

    const result = await pool.query(
      `SELECT category,
              COUNT(*) as total,
              SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed
       FROM goals
       WHERE user_id = $1 AND goal_date BETWEEN $2 AND $3
       GROUP BY category
       ORDER BY total DESC`,
      [req.userId, start, end]
    );

    const categories = result.rows.map((r) => ({
      category: r.category,
      total: parseInt(r.total, 10),
      completed: parseInt(r.completed, 10),
    }));

    res.json({ start, end, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to build category breakdown" });
  }
});

export default router;
