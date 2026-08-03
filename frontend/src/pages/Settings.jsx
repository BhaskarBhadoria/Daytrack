import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch((err) => setError(err.message));
  }, []);

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
    </div>
  );
}
