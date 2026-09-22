CREATE TABLE IF NOT EXISTS global_products (
  id TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  image_url TEXT,
  product_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS global_offers (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  source TEXT NOT NULL,
  source_item_id TEXT,
  title TEXT NOT NULL,
  offer_url TEXT NOT NULL,
  price REAL,
  currency TEXT,
  shipping_price REAL,
  shipping_currency TEXT,
  availability TEXT,
  condition TEXT,
  country TEXT,
  affiliate_url TEXT,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  UNIQUE(source, source_item_id)
);

CREATE TABLE IF NOT EXISTS global_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  source TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL,
  shipping_price REAL,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_global_offers_product_source ON global_offers(product_id,source);
CREATE INDEX IF NOT EXISTS idx_global_offers_checked ON global_offers(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_price_history_product_time ON global_price_history(product_id,checked_at DESC);
