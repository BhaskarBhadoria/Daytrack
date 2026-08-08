import { useEffect, useState } from "react";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Journal() {
  const [date, setDate] = useState(todayStr());
  const [content, setContent] = useState("");
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  async function loadEntry(forDate) {
    setLoading(true);
    try {
      const entry = await api.getJournalEntry(forDate);
      setContent(entry.content || "");
      setSavedAt(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecent() {
    try {
      setRecent(await api.getRecentJournalEntries());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadEntry(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    loadRecent();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api.saveJournalEntry(date, content);
      setSavedAt(new Date());
      loadRecent();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="journal-page">
      <div className="dashboard-hero">
        <div>
          <p className="hero-greeting">Private space to write</p>
          <h1>Journal</h1>
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayStr()} />
      </div>
      <p className="empty">One entry per day — whatever's on your mind.</p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <Spinner label="Loading entry" />
      ) : (
        <>
          <textarea
            className="journal-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write about today…"
            rows={12}
          />
          <div className="journal-toolbar">
            <span className="attendance-fine-print">{wordCount} words</span>
            <button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save entry"}
            </button>
            {savedAt && <span className="success">Saved ✓</span>}
          </div>
        </>
      )}

      {recent.length > 0 && (
        <>
          <h2 className="settings-section-title">Recent entries</h2>
          <ul className="journal-recent-list">
            {recent
              .filter((r) => r.entry_date.slice(0, 10) !== date)
              .map((r) => (
                <li key={r.entry_date} className="journal-recent-item" onClick={() => setDate(r.entry_date.slice(0, 10))}>
                  <span className="sleep-date">{r.entry_date.slice(0, 10)}</span>
                  <span className="journal-preview">{r.content.slice(0, 90)}{r.content.length > 90 ? "…" : ""}</span>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}
