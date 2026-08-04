import { useEffect, useState } from "react";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default function Timetable() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("07:00");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await api.getTimetable();
      setSlots(data.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time)));
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
      });
      setSlots((prev) => [...prev, slot].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time)));
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

  return (
    <div className="timetable-page">
      <h1>Daily Timetable</h1>
      <p className="empty">
        A fixed schedule that repeats every day — separate from your day-specific goals.
      </p>

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
        <button type="submit">Add block</button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <Spinner />
      ) : slots.length === 0 ? (
        <p className="empty">No timetable blocks yet — add your first one above.</p>
      ) : (
        <ul className="timetable-list">
          {slots.map((s) => (
            <li key={s.id} className="timetable-slot">
              <span className="timetable-time">
                {s.start_time} – {s.end_time}
              </span>
              <span className="timetable-title">{s.title}</span>
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
