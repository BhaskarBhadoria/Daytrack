-- DayTrack database schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- A "goal" belongs to a specific date and is either:
--   'planned'  -> decided the day before (or earlier) for this date
--   'same_day' -> added on the day itself
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_date DATE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  type TEXT NOT NULL CHECK (type IN ('planned', 'same_day')),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sleep_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,        -- the date the sleep is attributed to (usually the wake-up date)
  bed_time TIMESTAMP NOT NULL,
  wake_time TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL,
  quality SMALLINT,              -- 1-5 self rated, optional
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_goals_user_date ON goals(user_id, goal_date);
CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON sleep_logs(user_id, log_date);

CREATE TABLE IF NOT EXISTS reminder_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan_reminder_enabled BOOLEAN DEFAULT FALSE,
  plan_reminder_time TEXT DEFAULT '21:00',   -- HH:MM, 24h, local browser time
  sleep_reminder_enabled BOOLEAN DEFAULT FALSE,
  sleep_reminder_time TEXT DEFAULT '07:00',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- A recurring daily timetable: the same block schedule every day (e.g. "6-8am Study",
-- "9-5 College"), separate from the day-specific goals in the `goals` table.
CREATE TABLE IF NOT EXISTS timetable_slots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  start_time TEXT NOT NULL,  -- HH:MM 24h
  end_time TEXT NOT NULL,    -- HH:MM 24h
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timetable_user ON timetable_slots(user_id, start_time);

-- Tracks which UPSC syllabus topics the user has completed. The syllabus tree
-- itself lives as static data in the frontend; this just stores checked state.
CREATE TABLE IF NOT EXISTS syllabus_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, item_key)
);

-- Stores each user's Google OAuth refresh token so we can push events to
-- their Google Calendar without asking them to re-authenticate every time.
CREATE TABLE IF NOT EXISTS google_tokens (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  connected_at TIMESTAMP DEFAULT NOW()
);
