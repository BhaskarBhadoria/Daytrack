import { useEffect, useState } from "react";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  const [subjects, setSubjects] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [summary, setSummary] = useState([]);
  const [records, setRecords] = useState({});
  const [date, setDate] = useState(todayStr());
  const [newSubject, setNewSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);

  // schedule form state
  const [schSubject, setSchSubject] = useState("");
  const [schDay, setSchDay] = useState(1);
  const [schStart, setSchStart] = useState("09:00");
  const [schEnd, setSchEnd] = useState("10:00");

  async function loadAll() {
    setLoading(true);
    try {
      const [subs, sum, sched] = await Promise.all([
        api.getSubjects(),
        api.getAttendanceSummary(),
        api.getSchedule(),
      ]);
      setSubjects(subs);
      setSummary(sum);
      setSchedule(sched);
      if (subs.length > 0) setSchSubject(String(subs[0].id));
      await loadRecords(date);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecords(forDate) {
    try {
      const recs = await api.getAttendanceRecords(forDate);
      const map = {};
      recs.forEach((r) => (map[r.subject_id] = r.status));
      setRecords(map);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRecords(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function handleAddSubject(e) {
    e.preventDefault();
    if (!newSubject.trim()) return;
    setError("");
    try {
      const subj = await api.createSubject(newSubject.trim());
      setSubjects((prev) => [...prev, subj].sort((a, b) => a.name.localeCompare(b.name)));
      setSummary((prev) => [...prev, { id: subj.id, name: subj.name, present: 0, absent: 0, cancelled: 0, percentage: null }]);
      setNewSubject("");
      if (!schSubject) setSchSubject(String(subj.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteSubject(id) {
    await api.deleteSubject(id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setSummary((prev) => prev.filter((s) => s.id !== id));
    setSchedule((prev) => prev.filter((s) => s.subject_id !== id));
  }

  async function handleAddSchedule(e) {
    e.preventDefault();
    if (!schSubject) return;
    setError("");
    try {
      const entry = await api.addScheduleEntry(Number(schSubject), Number(schDay), schStart, schEnd);
      setSchedule((prev) => [...prev, entry]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteSchedule(id) {
    await api.deleteScheduleEntry(id);
    setSchedule((prev) => prev.filter((s) => s.id !== id));
  }

  async function mark(subjectId, status) {
    setRecords((prev) => ({ ...prev, [subjectId]: status }));
    try {
      await api.saveAttendanceRecord(subjectId, date, status);
      const sum = await api.getAttendanceSummary();
      setSummary(sum);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Spinner label="Loading attendance" />;

  const selectedWeekday = new Date(date).getDay();
  const todaysSchedule = schedule
    .filter((s) => s.day_of_week === selectedWeekday)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const scheduledSubjectIds = new Set(todaysSchedule.map((s) => s.subject_id));
  const subjectsById = Object.fromEntries(subjects.map((s) => [s.id, s]));

  return (
    <div className="attendance-page">
      <h1>Attendance</h1>

      <form className="add-goal-form" onSubmit={handleAddSubject}>
        <input
          type="text"
          placeholder="Add a subject (e.g. Polity, DSP Lab)"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
        />
        <button type="submit">Add subject</button>
      </form>

      {error && <p className="error">{error}</p>}

      {subjects.length > 0 && (
        <>
          <button type="button" className="link-toggle" onClick={() => setShowSchedule((v) => !v)}>
            {showSchedule ? "Hide" : "Set"} which days/hours each subject meets ▾
          </button>

          {showSchedule && (
            <div className="settings-form" style={{ marginBottom: 24 }}>
              <form className="schedule-form" onSubmit={handleAddSchedule}>
                <select value={schSubject} onChange={(e) => setSchSubject(e.target.value)}>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select value={schDay} onChange={(e) => setSchDay(e.target.value)}>
                  {DAY_LABELS.map((label, idx) => (
                    <option key={idx} value={idx}>
                      {label}
                    </option>
                  ))}
                </select>
                <input type="time" value={schStart} onChange={(e) => setSchStart(e.target.value)} />
                <span className="time-sep">to</span>
                <input type="time" value={schEnd} onChange={(e) => setSchEnd(e.target.value)} />
                <button type="submit">Add</button>
              </form>

              {schedule.length > 0 && (
                <ul className="schedule-list">
                  {schedule.map((s) => (
                    <li key={s.id}>
                      <span className="tag">{DAY_LABELS[s.day_of_week]}</span>
                      <span>{subjectsById[s.subject_id]?.name || "—"}</span>
                      <span className="timetable-time">
                        {s.start_time}–{s.end_time}
                      </span>
                      <button className="icon-btn" onClick={() => handleDeleteSchedule(s.id)} title="Remove">
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="dashboard-header">
            <h2 style={{ margin: 0 }}>Mark attendance</h2>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayStr()} />
          </div>

          {todaysSchedule.length === 0 ? (
            <p className="empty">No classes scheduled on {DAY_LABELS[selectedWeekday]}s.</p>
          ) : (
            <ul className="attendance-list">
              {todaysSchedule.map((s) => {
                const subj = subjectsById[s.subject_id];
                if (!subj) return null;
                const status = records[subj.id];
                return (
                  <li key={s.id} className="attendance-row">
                    <div className="attendance-name-block">
                      <span className="attendance-name">{subj.name}</span>
                      <span className="attendance-time">
                        {s.start_time}–{s.end_time}
                      </span>
                    </div>
                    <div className="attendance-buttons">
                      <button
                        className={`att-btn present ${status === "present" ? "active" : ""}`}
                        onClick={() => mark(subj.id, "present")}
                        type="button"
                      >
                        Present
                      </button>
                      <button
                        className={`att-btn absent ${status === "absent" ? "active" : ""}`}
                        onClick={() => mark(subj.id, "absent")}
                        type="button"
                      >
                        Absent
                      </button>
                      <button
                        className={`att-btn cancelled ${status === "cancelled" ? "active" : ""}`}
                        onClick={() => mark(subj.id, "cancelled")}
                        type="button"
                      >
                        Cancelled
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <h2 className="settings-section-title">All subjects</h2>
          <ul className="attendance-list">
            {subjects.map((s) => (
              <li key={s.id} className="attendance-row">
                <span className="attendance-name">{s.name}</span>
                {!scheduledSubjectIds.has(s.id) && (
                  <span className="empty" style={{ flex: 1 }}>
                    Not scheduled today
                  </span>
                )}
                <button className="icon-btn" onClick={() => handleDeleteSubject(s.id)} title="Delete subject">
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <h2 className="settings-section-title">Overall attendance</h2>
          <div className="summary-cards">
            {summary.map((s) => (
              <div key={s.id} className="card">
                <span className="card-value">{s.percentage === null ? "—" : `${s.percentage}%`}</span>
                <span className="card-label">{s.name}</span>
                <span className="attendance-fine-print">
                  {s.present} present / {s.absent} absent
                  {s.cancelled > 0 ? ` / ${s.cancelled} cancelled` : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {subjects.length === 0 && <p className="empty">Add your subjects above to start tracking attendance.</p>}
    </div>
  );
}
