import { useEffect, useState } from "react";
import { api } from "../api.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function SleepLog() {
  const [logDate, setLogDate] = useState(todayStr());
  const [bedTime, setBedTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [quality, setQuality] = useState(3);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRecentLogs() {
    const end = todayStr();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 13);
    const start = startDate.toISOString().slice(0, 10);
    try {
      const data = await api.getSleep(start, end);
      setLogs(data.reverse());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadRecentLogs();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      // Bed time is the night before the wake-up date.
      const bedDate = new Date(logDate);
      bedDate.setDate(bedDate.getDate() - 1);
      const bedDateStr = bedDate.toISOString().slice(0, 10);

      const bed_time = new Date(`${bedDateStr}T${bedTime}:00`).toISOString();
      const wake_time = new Date(`${logDate}T${wakeTime}:00`).toISOString();

      await api.logSleep({ log_date: logDate, bed_time, wake_time, quality: Number(quality) });
      setSuccess("Sleep logged!");
      loadRecentLogs();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="sleep-page">
      <h1>Sleep Tracker</h1>
      <form className="sleep-form" onSubmit={handleSubmit}>
        <label>
          Wake-up date
          <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} max={todayStr()} />
        </label>
        <label>
          Bed time (previous night)
          <input type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} />
        </label>
        <label>
          Wake time
          <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
        </label>
        <label>
          Sleep quality (1-5)
          <input
            type="number"
            min="1"
            max="5"
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
          />
        </label>
        <button type="submit">Log sleep</button>
      </form>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <h2>Recent nights</h2>
      {logs.length === 0 ? (
        <p className="empty">No sleep logged yet.</p>
      ) : (
        <ul className="sleep-list">
          {logs.map((l) => (
            <li key={l.id}>
              <span className="sleep-date">{l.log_date.slice(0, 10)}</span>
              <span>{formatDuration(l.duration_minutes)}</span>
              {l.quality && <span className="tag">Quality {l.quality}/5</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
