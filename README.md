# DayTrack

A full-stack personal tracker: daily goals (planned ahead vs decided same-day),
sleep logging, and a weekly report with charts. Multi-user with login/signup.

- **Backend:** Node.js + Express + PostgreSQL + JWT auth
- **Frontend:** React + Vite + Recharts

---

## 1. Run locally first (recommended, 5 minutes)

### Get a free Postgres database
1. Go to https://neon.tech (or https://supabase.com) → sign up free → create a project.
2. Copy the connection string (looks like `postgres://user:pass@host/dbname`).

### Backend
```bash
cd backend
cp .env.example .env
# edit .env: paste your DATABASE_URL, and set JWT_SECRET to any long random string
npm install
npm run dev
```
The server auto-creates all tables on first boot (from `schema.sql`).
It runs on http://localhost:4000 — check http://localhost:4000/api/health.

### Frontend
```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev
```
Open http://localhost:5173 — sign up and start tracking.

---

## 2. Deploy online (so you can use it from your phone)

### Step A — Database (Neon, free)
Already have this from step 1. Keep the connection string handy.

### Step B — Backend (Render, free tier)
1. Push this whole `daytrack` folder to a GitHub repo.
2. Go to https://render.com → New → Web Service → connect your repo.
3. Set **Root Directory** to `backend`.
4. Build command: `npm install` — Start command: `npm start`.
5. Add environment variables: `DATABASE_URL` (from Neon) and `JWT_SECRET` (random string).
6. Deploy. Render gives you a URL like `https://daytrack-backend.onrender.com`.
7. Confirm `https://your-backend-url.onrender.com/api/health` returns `{"status":"ok"}`.

*(Railway or Fly.io work the same way if you prefer them over Render.)*

### Step C — Frontend (Vercel, free)
1. Go to https://vercel.com → New Project → import the same repo.
2. Set **Root Directory** to `frontend`.
3. Add environment variable: `VITE_API_URL` = `https://your-backend-url.onrender.com/api`
4. Deploy. Vercel gives you a URL like `https://daytrack.vercel.app`.

Open that URL on your phone or laptop — sign up, and you're live.

**Note:** Render's free tier sleeps after 15 minutes of inactivity, so the first
request after a while takes ~30s to wake up. That's normal on free hosting.

---

## Features

- **Signup/Login** — JWT-based auth, passwords hashed with bcrypt.
- **Today's goals** — split into "Planned" (added the day before, for tomorrow)
  and "Added same day" (added on the day itself). Check off, delete, browse past days.
- **Sleep tracker** — log bed time / wake time per night, auto-calculates duration,
  optional 1–5 quality rating, shows last 14 nights.
- **Weekly report** — completion rate, total goals done, average sleep, with
  bar chart (goals completed/day) and line chart (sleep hours/day). Navigate
  week by week.

## Project structure
```
daytrack/
  backend/
    server.js        entrypoint
    db.js             postgres pool + auto schema init
    schema.sql         table definitions
    routes/             auth.js, goals.js, sleep.js, reports.js
    middleware/         authMiddleware.js (JWT check)
  frontend/
    src/
      pages/            Login, Signup, Dashboard, SleepLog, WeeklyReport
      context/           AuthContext.jsx
      api.js              fetch wrapper for the backend
```

## Extending it later
- Add categories/tags analytics, streaks, monthly view.
- Push notifications / reminders (would need a service worker + cron).
- Export weekly report as PDF (could reuse this chat to build that when you're ready).
