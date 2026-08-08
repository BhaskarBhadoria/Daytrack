import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api } from "../api.js";

const CATEGORY_COLORS = ["#00adb5", "#393e46", "#d9a441", "#d0453d", "#7fd8dc", "#8a6fd4", "#2f8f5b"];

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function WeeklyReport() {
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [report, setReport] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const data = await api.getWeeklyReport(weekStart);
      setReport(data);
      const catData = await api.getCategories(data.week_start, data.week_end);
      setCategories(catData.categories);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [weekStart]);

  function shiftWeek(days) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + days);
    setWeekStart(d.toISOString().slice(0, 10));
  }

  const chartData =
    report?.days.map((d) => ({
      date: d.date.slice(5),
      planned: d.planned_done,
      plannedTotal: d.planned,
      sameDay: d.same_day_done,
      sameDayTotal: d.same_day,
    })) || [];

  const sleepData =
    report?.sleep.map((s) => ({
      date: s.date.slice(5),
      hours: Math.round((s.duration_minutes / 60) * 10) / 10,
    })) || [];

  return (
    <div className="report-page">
      <div className="dashboard-hero">
        <div>
          <p className="hero-greeting">This week</p>
          <h1>Weekly Report</h1>
        </div>
        <div className="week-nav">
          <button onClick={() => shiftWeek(-7)}>◀ Prev</button>
          <span>
            {report?.week_start} – {report?.week_end}
          </span>
          <button onClick={() => shiftWeek(7)}>Next ▶</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {report && (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <span className="stat-icon">✅</span>
              <div>
                <span className="stat-value">{report.summary.total_completed}</span>
                <span className="stat-label">Goals completed</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📈</span>
              <div>
                <span className="stat-value">{report.summary.completion_rate}%</span>
                <span className="stat-label">Completion rate</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🌙</span>
              <div>
                <span className="stat-value">
                  {report.summary.avg_sleep_minutes
                    ? `${Math.round((report.summary.avg_sleep_minutes / 60) * 10) / 10}h`
                    : "—"}
                </span>
                <span className="stat-label">Avg sleep</span>
              </div>
            </div>
          </div>

          <div className="report-charts-grid">
            <div className="chart-card">
              <h2>Goals completed per day</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-soft)" />
                  <YAxis allowDecimals={false} stroke="var(--text-soft)" />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="planned" name="Planned done" fill="#00adb5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sameDay" name="Same-day done" fill="#393e46" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {categories.length > 0 && (
              <div className="chart-card">
                <h2>Goals by category</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(entry) => `${entry.category} (${entry.total})`}
                    >
                      {categories.map((entry, idx) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}
                      formatter={(value, name, props) => [`${props.payload.completed}/${value} done`, props.payload.category]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="chart-card">
            <h2>Sleep duration</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sleepData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-soft)" />
                <YAxis unit="h" stroke="var(--text-soft)" />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="hours" stroke="#00adb5" strokeWidth={2.5} dot={{ fill: "#00adb5" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
