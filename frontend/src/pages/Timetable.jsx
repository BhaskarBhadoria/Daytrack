import { useEffect, useState } from "react";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

const DAYS = [
  { value: "every", label: "Every day" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default function Timetable() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(new Date().getDay());
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("07:00");
  const [formDay, setFormDay] = useState(new Date().getDay());
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await api.getTimetable();
      setSlots(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setError("");
    try {
      const slot = await api.createTimetableSlot({
        title: title.trim(),
        category: category.trim() || "general",
        start_time: startTime,
        end_time: endTime,
        day_of_week: formDay === "every" ? null : formDay,
      });
      setSlots((prev) => [...prev, slot]);
      setTitle("");
      setCategory("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    await api.deleteTimetableSlot(id);
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  const visibleSlots = slots
    .filter((s) => s.day_of_week === null || s.day_of_week === activeDay)
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

  return (
    <div className="timetable-page">
      <h1>Daily Timetable</h1>
      <p className="empty">
        Different days can have different schedules — pick "Every day" for things that repeat daily.
      </p>

      <div className="day-tabs">
        {DAYS.filter((d) => d.value !== "every").map((d) => (
          <button
            key={d.value}
            className={`day-tab ${activeDay === d.value ? "active" : ""}`}
            onClick={() => setActiveDay(d.value)}
            type="button"
          >
            {d.label}
          </button>
        ))}
      </div>

      <form className="add-goal-form timetable-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Block name (e.g. Morning study)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <span className="time-sep">to</span>
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        <select value={formDay} onChange={(e) => setFormDay(e.target.value === "every" ? "every" : Number(e.target.value))}>
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.value === "every" ? "Every day" : `On ${d.label}`}
            </option>
          ))}
        </select>
        <button type="submit">Add block</button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <Spinner />
      ) : visibleSlots.length === 0 ? (
        <p className="empty">No blocks for this day yet.</p>
      ) : (
        <ul className="timetable-list">
          {visibleSlots.map((s) => (
            <li key={s.id} className="timetable-slot">
              <span className="timetable-time">
                {s.start_time} – {s.end_time}
              </span>
              <span className="timetable-title">{s.title}</span>
              {s.day_of_week === null && <span className="tag">Every day</span>}
              {s.category !== "general" && <span className="tag">{s.category}</span>}
              <button className="icon-btn" onClick={() => handleDelete(s.id)} title="Delete">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
