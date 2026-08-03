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
