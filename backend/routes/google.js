import { Router } from "express";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import pool from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// GET /api/google/status — is this user connected?
router.get("/status", requireAuth, async (req, res) => {
  const result = await pool.query("SELECT connected_at FROM google_tokens WHERE user_id = $1", [
    req.userId,
  ]);
  res.json({ connected: result.rows.length > 0, connected_at: result.rows[0]?.connected_at || null });
});

// GET /api/google/auth-url — returns the Google consent URL to redirect the browser to.
// Uses a short-lived signed "state" token (instead of the normal Bearer header) because
// this URL is opened via full-page navigation, not a fetch() call.
router.get("/auth-url", requireAuth, (req, res) => {
  const client = oauthClient();
  const state = jwt.sign({ userId: req.userId }, process.env.JWT_SECRET, { expiresIn: "10m" });
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh_token to be issued every time
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state,
  });
  res.json({ url });
});

// GET /api/google/callback — Google redirects here after the user grants access.
router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const payload = jwt.verify(state, process.env.JWT_SECRET);
    const client = oauthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      // Happens if the user had already granted access before and Google
      // skips issuing a new refresh_token. Ask them to revoke access at
      // https://myaccount.google.com/permissions and try connecting again.
      return res.redirect(`${process.env.FRONTEND_URL}/settings?google=no_refresh_token`);
    }

    await pool.query(
      `INSERT INTO google_tokens (user_id, refresh_token) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET refresh_token = $2, connected_at = NOW()`,
      [payload.userId, tokens.refresh_token]
    );
    res.redirect(`${process.env.FRONTEND_URL}/settings?google=connected`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.FRONTEND_URL}/settings?google=error`);
  }
});

// POST /api/google/disconnect
router.post("/disconnect", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM google_tokens WHERE user_id = $1", [req.userId]);
  res.json({ success: true });
});

async function getCalendarClient(userId) {
  const result = await pool.query("SELECT refresh_token FROM google_tokens WHERE user_id = $1", [
    userId,
  ]);
  if (result.rows.length === 0) return null;
  const client = oauthClient();
  client.setCredentials({ refresh_token: result.rows[0].refresh_token });
  return google.calendar({ version: "v3", auth: client });
}

// POST /api/google/sync-timetable — pushes recurring daily events, one per timetable block.
router.post("/sync-timetable", requireAuth, async (req, res) => {
  try {
    const calendar = await getCalendarClient(req.userId);
    if (!calendar) return res.status(400).json({ error: "Google Calendar not connected" });

    const slots = await pool.query(
      "SELECT * FROM timetable_slots WHERE user_id = $1 ORDER BY start_time",
      [req.userId]
    );

    let created = 0;
    let updated = 0;
    const todayStr = new Date().toISOString().slice(0, 10);

    for (const slot of slots.rows) {
      const eventBody = {
        summary: slot.title,
        description: `DayTrack recurring block${slot.category !== "general" ? ` — ${slot.category}` : ""}`,
        start: { dateTime: `${todayStr}T${slot.start_time}:00`, timeZone: "Asia/Kolkata" },
        end: { dateTime: `${todayStr}T${slot.end_time}:00`, timeZone: "Asia/Kolkata" },
        recurrence: ["RRULE:FREQ=DAILY"],
        extendedProperties: { private: { daytrack_slot_id: String(slot.id) } },
      };

      const existing = await calendar.events.list({
        calendarId: "primary",
        privateExtendedProperty: `daytrack_slot_id=${slot.id}`,
      });

      if (existing.data.items?.length > 0) {
        await calendar.events.update({
          calendarId: "primary",
          eventId: existing.data.items[0].id,
          requestBody: eventBody,
        });
        updated += 1;
      } else {
        await calendar.events.insert({ calendarId: "primary", requestBody: eventBody });
        created += 1;
      }
    }

    res.json({ success: true, created, updated, total: slots.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sync timetable to Google Calendar" });
  }
});

// POST /api/google/sync-goals  { date: "YYYY-MM-DD" } — pushes one all-day event
// summarizing that day's goals, updating it in place if it already exists.
router.post("/sync-goals", requireAuth, async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: "date is required" });

    const calendar = await getCalendarClient(req.userId);
    if (!calendar) return res.status(400).json({ error: "Google Calendar not connected" });

    const goals = await pool.query(
      "SELECT title, is_completed, type FROM goals WHERE user_id = $1 AND goal_date = $2 ORDER BY type",
      [req.userId, date]
    );
    if (goals.rows.length === 0) return res.status(400).json({ error: "No goals for that date" });

    const description = goals.rows
      .map((g) => `${g.is_completed ? "✓" : "☐"} [${g.type === "planned" ? "Planned" : "Same-day"}] ${g.title}`)
      .join("\n");

    const eventBody = {
      summary: `DayTrack Goals — ${date}`,
      description,
      start: { date },
      end: { date },
      extendedProperties: { private: { daytrack_goals_date: date } },
    };

    const existing = await calendar.events.list({
      calendarId: "primary",
      privateExtendedProperty: `daytrack_goals_date=${date}`,
    });

    if (existing.data.items?.length > 0) {
      await calendar.events.update({
        calendarId: "primary",
        eventId: existing.data.items[0].id,
        requestBody: eventBody,
      });
    } else {
      await calendar.events.insert({ calendarId: "primary", requestBody: eventBody });
    }

    res.json({ success: true, goal_count: goals.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sync goals to Google Calendar" });
  }
});

export default router;
