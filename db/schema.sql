-- BuySell.Best personalization schema
-- The Pages Functions also create these tables automatically, so this file is useful
-- for manual inspection/backup and future migrations.

CREATE TABLE IF NOT EXISTS visitor_profiles (
  visitor_id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  currency TEXT NOT NULL,
  personalization_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS behavior_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  listing_id TEXT,
  category TEXT,
  brand TEXT,
  query TEXT,
  item_price REAL,
  item_currency TEXT,
  item_location TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interest_scores (
  visitor_id TEXT NOT NULL,
  category TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(visitor_id,category)
);

CREATE TABLE IF NOT EXISTS item_affinity (
  visitor_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(visitor_id,listing_id)
);

CREATE INDEX IF NOT EXISTS idx_behavior_events_visitor_time ON behavior_events(visitor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interest_scores_visitor_score ON interest_scores(visitor_id,score DESC);
CREATE INDEX IF NOT EXISTS idx_item_affinity_visitor_score ON item_affinity(visitor_id,score DESC);
