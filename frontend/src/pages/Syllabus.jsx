import { useEffect, useMemo, useState } from "react";
import baseSyllabus from "../data/syllabusData.js";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

function slugify(name) {
  return (
    "custom-" +
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  );
}

export default function Syllabus() {
  const [done, setDone] = useState(new Set());
  const [customSubjects, setCustomSubjects] = useState([]);
  const [customTopics, setCustomTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSubject, setOpenSubject] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [topicDrafts, setTopicDrafts] = useState({}); // subject_key -> draft text

  useEffect(() => {
    Promise.all([api.getSyllabusProgress(), api.getCustomSyllabus()])
      .then(([keys, custom]) => {
        setDone(new Set(keys));
        setCustomSubjects(custom.subjects);
        setCustomTopics(custom.topics);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Merge the static syllabus with the user's custom subjects/topics.
  const syllabus = useMemo(() => {
    const merged = baseSyllabus.map((sub) => ({
      ...sub,
      topics: sub.topics.map((t) => ({ title: t, custom: false })),
    }));
    for (const sub of customSubjects) {
      merged.push({ id: sub.subject_key, name: sub.name, topics: [], customSubject: true });
    }
    for (const t of customTopics) {
      const target = merged.find((s) => s.id === t.subject_key);
      if (target) target.topics.push({ title: t.title, custom: true, customId: t.id });
    }
    return merged;
  }, [customSubjects, customTopics]);

  async function toggle(key) {
    const isDone = done.has(key);
    const next = new Set(done);
    isDone ? next.delete(key) : next.add(key);
    setDone(next);
    try {
      await api.updateSyllabusProgress(key, !isDone);
    } catch (err) {
      setError(err.message);
      setDone(done);
    }
  }

  async function handleAddSubject(e) {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setError("");
    const key = slugify(newSubjectName);
    try {
      const created = await api.addCustomSubject(key, newSubjectName.trim());
      setCustomSubjects((prev) => [...prev, created]);
      setNewSubjectName("");
      setOpenSubject(key);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteSubject(key) {
    await api.deleteCustomSubject(key);
    setCustomSubjects((prev) => prev.filter((s) => s.subject_key !== key));
    setCustomTopics((prev) => prev.filter((t) => t.subject_key !== key));
  }

  async function handleAddTopic(subjectKey) {
    const draft = (topicDrafts[subjectKey] || "").trim();
    if (!draft) return;
    setError("");
    try {
      const created = await api.addCustomTopic(subjectKey, draft);
      setCustomTopics((prev) => [...prev, created]);
      setTopicDrafts((prev) => ({ ...prev, [subjectKey]: "" }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTopic(id, subjectKey, title) {
    await api.deleteCustomTopic(id);
    setCustomTopics((prev) => prev.filter((t) => t.id !== id));
    // also clear its completion state if it was checked
    const key = `${subjectKey}::${title}`;
    if (done.has(key)) {
      const next = new Set(done);
      next.delete(key);
      setDone(next);
      api.updateSyllabusProgress(key, false).catch(() => {});
    }
  }

  const totalTopics = useMemo(() => syllabus.reduce((s, sub) => s + sub.topics.length, 0), [syllabus]);
  const totalDone = done.size;
  const overallPct = totalTopics ? Math.round((totalDone / totalTopics) * 100) : 0;

  const filtered = useMemo(() => {
    if (!query.trim()) return syllabus;
    const q = query.toLowerCase();
    return syllabus
      .map((sub) => ({
        ...sub,
        topics: sub.topics.filter((t) => t.title.toLowerCase().includes(q) || sub.name.toLowerCase().includes(q)),
      }))
      .filter((sub) => sub.topics.length > 0);
  }, [query, syllabus]);

  if (loading) return <Spinner label="Loading syllabus" />;

  return (
    <div className="syllabus-page">
      <p className="hero-greeting">Your syllabus, tracked</p>
      <h1>UPSC Syllabus Tracker</h1>

      <div className="syllabus-overall">
        <div className="syllabus-overall-bar">
          <div className="syllabus-overall-fill" style={{ width: `${overallPct}%` }} />
        </div>
        <span className="syllabus-overall-label">
          {totalDone} / {totalTopics} topics covered ({overallPct}%)
        </span>
      </div>

      <div className="syllabus-toolbar">
        <input
          type="text"
          className="syllabus-search"
          placeholder="Search topics or subjects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <form className="add-subject-form" onSubmit={handleAddSubject}>
          <input
            type="text"
            placeholder="Add a subject of your own…"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
          />
          <button type="submit">Add subject</button>
        </form>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="syllabus-list">
        {filtered.map((sub) => {
          const subDone = sub.topics.filter((t) => done.has(`${sub.id}::${t.title}`)).length;
          const pct = sub.topics.length ? Math.round((subDone / sub.topics.length) * 100) : 0;
          const isOpen = openSubject === sub.id || query.trim().length > 0;

          return (
            <div key={sub.id} className="syllabus-subject">
              <button
                type="button"
                className="syllabus-subject-header"
                onClick={() => setOpenSubject(isOpen && !query ? null : sub.id)}
              >
                <span className="syllabus-caret">{isOpen ? "▾" : "▸"}</span>
                <span className="syllabus-subject-name">
                  {sub.name}
                  {sub.customSubject && <span className="tag" style={{ marginLeft: 8 }}>custom</span>}
                </span>
                <span className="syllabus-subject-count">
                  {subDone}/{sub.topics.length}
                </span>
                <div className="syllabus-subject-bar">
                  <div className="syllabus-subject-fill" style={{ width: `${pct}%` }} />
                </div>
              </button>

              {isOpen && (
                <>
                  <ul className="syllabus-topic-list">
                    {sub.topics.map((t) => {
                      const key = `${sub.id}::${t.title}`;
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
                          <span>{t.title}</span>
                          {t.custom && (
                            <button
                              className="icon-btn"
                              onClick={() => handleDeleteTopic(t.customId, sub.id, t.title)}
                              title="Delete this topic"
                            >
                              ✕
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="add-topic-row">
                    <input
                      type="text"
                      placeholder="Add a topic to this subject…"
                      value={topicDrafts[sub.id] || ""}
                      onChange={(e) => setTopicDrafts((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTopic(sub.id)}
                    />
                    <button type="button" onClick={() => handleAddTopic(sub.id)}>
                      Add
                    </button>
                    {sub.customSubject && (
                      <button type="button" className="danger-link" onClick={() => handleDeleteSubject(sub.id)}>
                        Delete subject
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
