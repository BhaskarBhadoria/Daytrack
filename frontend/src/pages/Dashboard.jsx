import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function RadialProgress({ value, size = 56 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
    </svg>
  );
}

function GoalItem({ goal, onToggle, onDelete }) {
  return (
    <li className={`goal-item ${goal.is_completed ? "done" : ""}`}>
      <button
        className={`stamp-toggle ${goal.is_completed ? "stamped" : ""}`}
        onClick={() => onToggle(goal)}
        aria-pressed={goal.is_completed}
        aria-label={goal.is_completed ? "Mark incomplete" : "Mark complete"}
        type="button"
      >
        <span className="stamp-mark">✓</span>
      </button>
      <span className="goal-title">{goal.title}</span>
      {goal.category && goal.category !== "general" && (
        <span className="tag">{goal.category}</span>
      )}
      <button className="icon-btn" onClick={() => onDelete(goal.id)} title="Delete">
        ✕
      </button>
    </li>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [viewDate, setViewDate] = useState(todayStr());
  const [goals, setGoals] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [streak, setStreak] = useState(null);
  const [lastSleep, setLastSleep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTarget, setNewTarget] = useState("today");
  const [error, setError] = useState("");

  const isToday = viewDate === todayStr();

  async function loadGoals(date) {
    setLoading(true);
    try {
      setGoals(await api.getGoals(date));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals(viewDate);
  }, [viewDate]);

  useEffect(() => {
    api.getTimetable().then(setSchedule).catch(() => {});
    api.getStreak().then(setStreak).catch(() => {});
    api
      .getSleep(yesterdayStr(), todayStr())
      .then((rows) => setLastSleep(rows[rows.length - 1] || null))
      .catch(() => {});
  }, []);

  async function handleAddGoal(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError("");
    try {
      const targetDate = newTarget === "today" ? todayStr() : tomorrowStr();
      const type = newTarget === "today" ? "same_day" : "planned";
      const goal = await api.createGoal({
        title: newTitle.trim(),
        category: newCategory.trim() || "general",
        type,
        goal_date: targetDate,
      });
      setNewTitle("");
      setNewCategory("");
      if (targetDate === viewDate) setGoals((prev) => [...prev, goal]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggle(goal) {
    const updated = await api.updateGoal(goal.id, { is_completed: !goal.is_completed });
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
  }

  async function handleDelete(id) {
    await api.deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const planned = goals.filter((g) => g.type === "planned");
  const sameDay = goals.filter((g) => g.type === "same_day");
  const completedCount = goals.filter((g) => g.is_completed).length;
  const pct = goals.length ? Math.round((completedCount / goals.length) * 100) : 0;

  const [viewY, viewM, viewD] = viewDate.split("-").map(Number);
  const viewWeekday = new Date(viewY, viewM - 1, viewD).getDay();
  const todaysSchedule = schedule
    .filter((s) => s.day_of_week === null || s.day_of_week === viewWeekday)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const nowHHMM = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const nextBlock = isToday ? todaysSchedule.find((s) => s.start_time >= nowHHMM) : null;

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <div>
          <p className="hero-greeting">
            {greeting()}{user?.name ? `, ${user.name}` : ""}
          </p>
          <h1>{isToday ? "Today" : viewDate}</h1>
        </div>
        <input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)} max={tomorrowStr()} />
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <RadialProgress value={pct} />
          <div>
            <span className="stat-value">{completedCount}/{goals.length}</span>
            <span className="stat-label">Goals done</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <div>
            <span className="stat-value">{streak ? streak.current_streak : "—"}</span>
            <span className="stat-label">Day streak</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🌙</span>
          <div>
            <span className="stat-value">
              {lastSleep ? `${Math.floor(lastSleep.duration_minutes / 60)}h ${lastSleep.duration_minutes % 60}m` : "—"}
            </span>
            <span className="stat-label">Last night</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏱</span>
          <div>
            <span className="stat-value">{nextBlock ? nextBlock.title : "Free"}</span>
            <span className="stat-label">{nextBlock ? `at ${nextBlock.start_time}` : "Nothing scheduled"}</span>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="dashboard-columns">
        <div className="dashboard-col-main">
          {isToday && (
            <form className="add-goal-form" onSubmit={handleAddGoal}>
              <input
                type="text"
                placeholder="New goal..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <select value={newTarget} onChange={(e) => setNewTarget(e.target.value)}>
                <option value="today">For today</option>
                <option value="tomorrow">Plan for tomorrow</option>
              </select>
              <button type="submit">Add</button>
            </form>
          )}

          {loading ? (
            <Spinner label="Loading today's goals" />
          ) : (
            <>
              <section>
                <h2>Planned (decided ahead of time)</h2>
                {planned.length === 0 ? (
                  <p className="empty">No planned goals for this day.</p>
                ) : (
                  <ul className="goal-list">
                    {planned.map((g) => (
                      <GoalItem key={g.id} goal={g} onToggle={handleToggle} onDelete={handleDelete} />
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h2>Added same day</h2>
                {sameDay.length === 0 ? (
                  <p className="empty">No same-day goals yet.</p>
                ) : (
                  <ul className="goal-list">
                    {sameDay.map((g) => (
                      <GoalItem key={g.id} goal={g} onToggle={handleToggle} onDelete={handleDelete} />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>

        <div className="dashboard-col-side">
          <h2>Schedule</h2>
          {todaysSchedule.length === 0 ? (
            <p className="empty">Nothing scheduled for this day.</p>
          ) : (
            <ul className="timetable-list">
              {todaysSchedule.map((s) => (
                <li key={s.id} className={`timetable-slot readonly ${s === nextBlock ? "upcoming" : ""}`}>
                  <span className="timetable-time">
                    {s.start_time} – {s.end_time}
                  </span>
                  <span className="timetable-title">{s.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
