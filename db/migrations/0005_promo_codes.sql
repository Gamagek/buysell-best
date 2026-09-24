CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL,
  title TEXT NOT NULL,
  code TEXT,
  promo_type TEXT NOT NULL DEFAULT 'deal',
  value_text TEXT,
  url TEXT NOT NULL,
  country TEXT,
  terms TEXT,
  starts_at TEXT,
  expires_at TEXT,
  source TEXT NOT NULL,
  source_item_id TEXT,
  verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store, source, source_item_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_active_expiry
ON promo_codes(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_promo_codes_store
ON promo_codes(store, updated_at DESC);
