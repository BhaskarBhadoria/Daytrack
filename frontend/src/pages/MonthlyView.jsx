import { useEffect, useState } from "react";
import { api } from "../api.js";

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function daysInMonth(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function firstWeekdayOfMonth(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month - 1, 1).getDay(); // 0 = Sunday
}

function completionColor(completed, total) {
  if (total === 0) return "none";
  const rate = completed / total;
  if (rate === 0) return "none";
  if (rate < 0.5) return "low";
  if (rate < 1) return "mid";
  return "full";
}

export default function MonthlyView() {
  const [month, setMonth] = useState(currentMonthStr());
  const [dayData, setDayData] = useState({});
  const [streak, setStreak] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [monthly, streakData] = await Promise.all([api.getMonthly(month), api.getStreak()]);
      const map = {};
      for (const d of monthly.days) map[d.date] = d;
      setDayData(map);
      setStreak(streakData);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [month]);

  function shiftMonth(delta) {
    const [year, m] = month.split("-").map(Number);
    const d = new Date(year, m - 1 + delta, 1);
    setMonth(d.toISOString().slice(0, 7));
  }

  const totalDays = daysInMonth(month);
  const leadingBlanks = firstWeekdayOfMonth(month);
  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${month}-${String(day).padStart(2, "0")}`;
    cells.push({ day, dateStr, data: dayData[dateStr] });
  }

  return (
    <div className="monthly-page">
      <div className="dashboard-hero">
        <div>
          <p className="hero-greeting">Zoomed out</p>
          <h1>Monthly View</h1>
        </div>
        <div className="week-nav">
          <button onClick={() => shiftMonth(-1)}>◀ Prev</button>
          <span>{month}</span>
          <button onClick={() => shiftMonth(1)}>Next ▶</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {streak && (
        <div className="stat-row two-up">
          <div className="stat-card">
            <span className="stat-icon">🔥</span>
            <div>
              <span className="stat-value">{streak.current_streak}</span>
              <span className="stat-label">Current streak</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🏆</span>
            <div>
              <span className="stat-value">{streak.longest_streak}</span>
              <span className="stat-label">Longest streak</span>
            </div>
          </div>
        </div>
      )}

      <div className="chart-card">
        <div className="calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="calendar-weekday">
              {d}
            </div>
          ))}
          {cells.map((cell, idx) =>
            cell === null ? (
              <div key={`blank-${idx}`} className="calendar-cell blank" />
            ) : (
              <div
                key={cell.dateStr}
                className={`calendar-cell heat-${completionColor(
                  cell.data?.completed || 0,
                  cell.data?.total || 0
                )}`}
                title={
                  cell.data
                    ? `${cell.data.completed}/${cell.data.total} goals completed`
                    : "No goals logged"
                }
              >
                <span className="calendar-day-num">{cell.day}</span>
                {cell.data && (
                  <span className="calendar-day-frac">
                    {cell.data.completed}/{cell.data.total}
                  </span>
                )}
              </div>
            )
          )}
        </div>

        <div className="calendar-legend">
          <span className="legend-item"><span className="calendar-cell heat-none legend-swatch" /> None</span>
          <span className="legend-item"><span className="calendar-cell heat-low legend-swatch" /> &lt;50%</span>
          <span className="legend-item"><span className="calendar-cell heat-mid legend-swatch" /> 50-99%</span>
          <span className="legend-item"><span className="calendar-cell heat-full legend-swatch" /> 100%</span>
        </div>
      </div>
    </div>
  );
}
