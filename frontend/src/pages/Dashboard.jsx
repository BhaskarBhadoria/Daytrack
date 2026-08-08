import { useEffect, useState } from "react";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
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
  const [viewDate, setViewDate] = useState(todayStr());
  const [goals, setGoals] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTarget, setNewTarget] = useState("today"); // 'today' or 'tomorrow'
  const [error, setError] = useState("");

  const isToday = viewDate === todayStr();

  async function loadGoals(date) {
    setLoading(true);
    try {
      const data = await api.getGoals(date);
      setGoals(data);
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
    api
      .getTimetable()
      .then(setSchedule)
      .catch(() => {});
  }, []);

  async function handleAddGoal(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError("");
    try {
      const targetDate = newTarget === "today" ? todayStr() : tomorrowStr();
      // Goals added for today (while viewing today) are 'same_day'.
      // Goals added for tomorrow are 'planned' (decided ahead of time).
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

  const [viewY, viewM, viewD] = viewDate.split("-").map(Number);
  const viewWeekday = new Date(viewY, viewM - 1, viewD).getDay();
  const todaysSchedule = schedule
    .filter((s) => s.day_of_week === null || s.day_of_week === viewWeekday)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{isToday ? "Today" : viewDate}</h1>
        <input
          type="date"
          value={viewDate}
          onChange={(e) => setViewDate(e.target.value)}
          max={tomorrowStr()}
        />
      </div>

      {goals.length > 0 && (
        <p className="progress-summary">
          {completedCount} / {goals.length} goals completed
        </p>
      )}

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

      {error && <p className="error">{error}</p>}

      {todaysSchedule.length > 0 && (
        <section>
          <h2>Schedule</h2>
          <ul className="timetable-list">
            {todaysSchedule.map((s) => (
              <li key={s.id} className="timetable-slot readonly">
                <span className="timetable-time">
                  {s.start_time} – {s.end_time}
                </span>
                <span className="timetable-title">{s.title}</span>
                {s.day_of_week === null && <span className="tag">Every day</span>}
              </li>
            ))}
          </ul>
        </section>
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
  );
}
