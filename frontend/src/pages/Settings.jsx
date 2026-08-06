import { useEffect, useState } from "react";
import { api, downloadExport } from "../api.js";
import { useDoodlePreference } from "../context/DoodleContext.jsx";
import { DOODLE_PATTERNS } from "../utils/dailyDoodle.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Settings() {
  const { pattern, setPattern } = useDoodlePreference();
  const [settings, setSettings] = useState(null);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch((err) => setError(err.message));

    api
      .getGoogleStatus()
      .then((s) => setGoogleConnected(s.connected))
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const googleParam = params.get("google");
    if (googleParam === "connected") setSuccess("Google Calendar connected!");
    if (googleParam === "error") setError("Google Calendar connection failed — try again.");
    if (googleParam === "no_refresh_token")
      setError(
        "Google didn't grant fresh access. Visit myaccount.google.com/permissions, remove DayTrack, then try connecting again."
      );
    if (googleParam) window.history.replaceState({}, "", "/settings");
  }, []);

  async function connectGoogle() {
    setGoogleBusy(true);
    try {
      const { url } = await api.getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setGoogleBusy(false);
    }
  }

  async function disconnectGoogle() {
    setGoogleBusy(true);
    try {
      await api.disconnectGoogle();
      setGoogleConnected(false);
      setSuccess("Disconnected from Google Calendar.");
    } catch (err) {
      setError(err.message);
    } finally {
      setGoogleBusy(false);
    }
  }

  async function syncTimetable() {
    setGoogleBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await api.syncTimetableToGoogle();
      setSuccess(`Synced! ${result.created} created, ${result.updated} updated.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGoogleBusy(false);
    }
  }

  async function syncGoals() {
    setGoogleBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await api.syncGoalsToGoogle(todayStr());
      setSuccess(`Synced today's ${result.goal_count} goals to Google Calendar.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGoogleBusy(false);
    }
  }

  async function requestPermission() {
    if (typeof Notification === "undefined") {
      setError("This browser doesn't support notifications.");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSuccess("Saved!");
    } catch (err) {
      setError(err.message);
    }
  }

  if (!settings) return <p>Loading...</p>;

  return (
    <div className="settings-page">
      <h1>Reminders</h1>
      <p className="empty">
        These fire as browser notifications while this tab is open. They won't reach you if your
        browser is fully closed — that needs a paid always-on backend, which isn't set up here.
      </p>

      {permission !== "granted" && (
        <div className="notice-box">
          <p>Enable browser notifications to receive reminders.</p>
          <button onClick={requestPermission}>Enable notifications</button>
        </div>
      )}
      {permission === "granted" && <p className="success">Notifications enabled ✓</p>}

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-row">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.plan_reminder_enabled}
              onChange={(e) =>
                setSettings({ ...settings, plan_reminder_enabled: e.target.checked })
              }
            />
            Remind me to plan tomorrow's goals
          </label>
          <input
            type="time"
            value={settings.plan_reminder_time}
            onChange={(e) => setSettings({ ...settings, plan_reminder_time: e.target.value })}
            disabled={!settings.plan_reminder_enabled}
          />
        </div>

        <div className="settings-row">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.sleep_reminder_enabled}
              onChange={(e) =>
                setSettings({ ...settings, sleep_reminder_enabled: e.target.checked })
              }
            />
            Remind me to log last night's sleep
          </label>
          <input
            type="time"
            value={settings.sleep_reminder_time}
            onChange={(e) => setSettings({ ...settings, sleep_reminder_time: e.target.value })}
            disabled={!settings.sleep_reminder_enabled}
          />
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <button type="submit">Save reminders</button>
      </form>

      <h1 className="settings-section-title">Background pattern</h1>
      <div className="settings-form">
        <div className="settings-row">
          <span>Choose the subtle background doodle, or turn it off entirely.</span>
          <select value={pattern} onChange={(e) => setPattern(e.target.value)}>
            <option value="auto">Auto (changes daily)</option>
            {DOODLE_PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="none">None</option>
          </select>
        </div>
      </div>

      <h1 className="settings-section-title">Google Calendar</h1>
      <div className="notice-box">
        {googleConnected ? (
          <>
            <p>Connected — your timetable and goals can push to your Google Calendar.</p>
            <button onClick={disconnectGoogle} disabled={googleBusy}>
              Disconnect
            </button>
          </>
        ) : (
          <>
            <p>Connect your Google Calendar to see your timetable and goals there too.</p>
            <button onClick={connectGoogle} disabled={googleBusy}>
              Connect Google Calendar
            </button>
          </>
        )}
      </div>

      {googleConnected && (
        <div className="settings-form">
          <div className="settings-row">
            <span>Push your recurring timetable as daily calendar events</span>
            <button type="button" onClick={syncTimetable} disabled={googleBusy}>
              Sync timetable
            </button>
          </div>
          <div className="settings-row">
            <span>Push today's goals as a calendar event</span>
            <button type="button" onClick={syncGoals} disabled={googleBusy}>
              Sync today's goals
            </button>
          </div>
        </div>
      )}

      <h1 className="settings-section-title">Backup your data</h1>
      <div className="notice-box">
        <p>Download everything — goals, sleep, attendance, timetable, syllabus progress — as one JSON file.</p>
        <button onClick={() => downloadExport().catch((err) => setError(err.message))}>
          Export my data
        </button>
      </div>
    </div>
  );
}
