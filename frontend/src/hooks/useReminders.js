import { useEffect } from "react";
import { api } from "../api.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currentHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Polls reminder settings and fires a Notification when the current time
// matches, once per day per reminder. Only works while this tab is open.
export function useReminders(enabled) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof Notification === "undefined") return;

    let settings = null;

    api
      .getSettings()
      .then((s) => (settings = s))
      .catch(() => {});

    const interval = setInterval(() => {
      if (!settings || Notification.permission !== "granted") return;
      const now = currentHHMM();
      const today = todayStr();

      if (settings.plan_reminder_enabled && settings.plan_reminder_time === now) {
        const key = `daytrack_reminder_plan_${today}`;
        if (!localStorage.getItem(key)) {
          new Notification("DayTrack", { body: "Time to plan tomorrow's goals." });
          localStorage.setItem(key, "1");
        }
      }

      if (settings.sleep_reminder_enabled && settings.sleep_reminder_time === now) {
        const key = `daytrack_reminder_sleep_${today}`;
        if (!localStorage.getItem(key)) {
          new Notification("DayTrack", { body: "Don't forget to log last night's sleep." });
          localStorage.setItem(key, "1");
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [enabled]);
}
