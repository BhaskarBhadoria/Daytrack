import { useEffect, useMemo, useState } from "react";
import syllabus from "../data/syllabusData.js";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

export default function Syllabus() {
  const [done, setDone] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [openSubject, setOpenSubject] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getSyllabusProgress()
      .then((keys) => setDone(new Set(keys)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key) {
    const isDone = done.has(key);
    const next = new Set(done);
    isDone ? next.delete(key) : next.add(key);
    setDone(next);
    try {
      await api.updateSyllabusProgress(key, !isDone);
    } catch (err) {
      setError(err.message);
      setDone(done); // revert on failure
    }
  }

  const totalTopics = useMemo(() => syllabus.reduce((s, sub) => s + sub.topics.length, 0), []);
  const totalDone = done.size;
  const overallPct = totalTopics ? Math.round((totalDone / totalTopics) * 100) : 0;

  const filtered = useMemo(() => {
    if (!query.trim()) return syllabus;
    const q = query.toLowerCase();
    return syllabus
      .map((sub) => ({
        ...sub,
        topics: sub.topics.filter((t) => t.toLowerCase().includes(q) || sub.name.toLowerCase().includes(q)),
      }))
      .filter((sub) => sub.topics.length > 0);
  }, [query]);

  if (loading) return <Spinner label="Loading syllabus" />;

  return (
    <div className="syllabus-page">
      <h1>UPSC Syllabus Tracker</h1>

      <div className="syllabus-overall">
        <div className="syllabus-overall-bar">
          <div className="syllabus-overall-fill" style={{ width: `${overallPct}%` }} />
        </div>
        <span className="syllabus-overall-label">
          {totalDone} / {totalTopics} topics covered ({overallPct}%)
        </span>
      </div>

      <input
        type="text"
        className="syllabus-search"
        placeholder="Search topics or subjects…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <p className="error">{error}</p>}

      <div className="syllabus-list">
        {filtered.map((sub) => {
          const subDone = sub.topics.filter((t) => done.has(`${sub.id}::${t}`)).length;
          const pct = Math.round((subDone / sub.topics.length) * 100);
          const isOpen = openSubject === sub.id || query.trim().length > 0;

          return (
            <div key={sub.id} className="syllabus-subject">
              <button
                type="button"
                className="syllabus-subject-header"
                onClick={() => setOpenSubject(isOpen && !query ? null : sub.id)}
              >
                <span className="syllabus-caret">{isOpen ? "▾" : "▸"}</span>
                <span className="syllabus-subject-name">{sub.name}</span>
                <span className="syllabus-subject-count">
                  {subDone}/{sub.topics.length}
                </span>
                <div className="syllabus-subject-bar">
                  <div className="syllabus-subject-fill" style={{ width: `${pct}%` }} />
                </div>
              </button>

              {isOpen && (
                <ul className="syllabus-topic-list">
                  {sub.topics.map((t) => {
                    const key = `${sub.id}::${t}`;
                    const isDone = done.has(key);
                    return (
                      <li key={key} className={`syllabus-topic ${isDone ? "done" : ""}`}>
                        <button
                          className={`stamp-toggle small ${isDone ? "stamped" : ""}`}
                          onClick={() => toggle(key)}
                          type="button"
                          aria-pressed={isDone}
                        >
                          <span className="stamp-mark">✓</span>
                        </button>
                        <span>{t}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
