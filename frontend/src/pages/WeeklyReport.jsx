import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api } from "../api.js";

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
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const data = await api.getWeeklyReport(weekStart);
      setReport(data);
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
      <div className="dashboard-header">
        <h1>Weekly Report</h1>
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
          <div className="summary-cards">
            <div className="card">
              <span className="card-value">{report.summary.total_completed}</span>
              <span className="card-label">Goals completed</span>
            </div>
            <div className="card">
              <span className="card-value">{report.summary.completion_rate}%</span>
              <span className="card-label">Completion rate</span>
            </div>
            <div className="card">
              <span className="card-value">
                {report.summary.avg_sleep_minutes
                  ? `${Math.round((report.summary.avg_sleep_minutes / 60) * 10) / 10}h`
                  : "—"}
              </span>
              <span className="card-label">Avg sleep</span>
            </div>
          </div>

          <h2>Goals completed per day</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="planned" name="Planned done" fill="#4f46e5" />
              <Bar dataKey="sameDay" name="Same-day done" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>

          <h2>Sleep duration</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={sleepData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis unit="h" />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#f97316" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
