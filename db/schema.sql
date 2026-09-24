-- BuySell.Best D1 schema
CREATE TABLE IF NOT EXISTS visitor_profiles (visitor_id TEXT PRIMARY KEY,country TEXT NOT NULL,currency TEXT NOT NULL,personalization_enabled INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS behavior_events (id INTEGER PRIMARY KEY AUTOINCREMENT,visitor_id TEXT NOT NULL,event_type TEXT NOT NULL,listing_id TEXT,category TEXT,brand TEXT,query TEXT,item_price REAL,item_currency TEXT,item_location TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS interest_scores (visitor_id TEXT NOT NULL,category TEXT NOT NULL,score REAL NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(visitor_id,category));
CREATE TABLE IF NOT EXISTS item_affinity (visitor_id TEXT NOT NULL,listing_id TEXT NOT NULL,score REAL NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(visitor_id,listing_id));
CREATE TABLE IF NOT EXISTS listing_stats (listing_id TEXT PRIMARY KEY,view_count INTEGER NOT NULL DEFAULT 0,unique_view_count INTEGER NOT NULL DEFAULT 0,like_count INTEGER NOT NULL DEFAULT 0,interested_count INTEGER NOT NULL DEFAULT 0,save_count INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS listing_views (visitor_id TEXT NOT NULL,listing_id TEXT NOT NULL,view_bucket TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(visitor_id,listing_id,view_bucket));
CREATE TABLE IF NOT EXISTS listing_unique_views (visitor_id TEXT NOT NULL,listing_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(visitor_id,listing_id));
CREATE TABLE IF NOT EXISTS listing_reactions (visitor_id TEXT NOT NULL,listing_id TEXT NOT NULL,reaction_type TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(visitor_id,listing_id,reaction_type));
CREATE INDEX IF NOT EXISTS idx_behavior_events_visitor_time ON behavior_events(visitor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interest_scores_visitor_score ON interest_scores(visitor_id,score DESC);
CREATE INDEX IF NOT EXISTS idx_item_affinity_visitor_score ON item_affinity(visitor_id,score DESC);
CREATE INDEX IF NOT EXISTS idx_listing_views_listing_time ON listing_views(listing_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_reactions_listing ON listing_reactions(listing_id,reaction_type);
CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,title TEXT NOT NULL,brand TEXT,category TEXT NOT NULL,price REAL NOT NULL,currency TEXT NOT NULL DEFAULT 'USD',condition TEXT,description TEXT,image_url TEXT,status TEXT NOT NULL DEFAULT 'pending',location TEXT,video_url TEXT,video_embed_url TEXT,video_thumbnail_url TEXT,video_duration TEXT,video_upload_date TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_listings_status_created ON listings(status,created_at DESC);

CREATE TABLE IF NOT EXISTS global_products (id TEXT PRIMARY KEY,canonical_key TEXT NOT NULL UNIQUE,title TEXT NOT NULL,brand TEXT,category TEXT,image_url TEXT,product_url TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS global_offers (id TEXT PRIMARY KEY,product_id TEXT NOT NULL,source TEXT NOT NULL,source_item_id TEXT,title TEXT NOT NULL,offer_url TEXT NOT NULL,price REAL,currency TEXT,shipping_price REAL,shipping_currency TEXT,availability TEXT,condition TEXT,country TEXT,affiliate_url TEXT,checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TEXT,UNIQUE(source,source_item_id));
CREATE TABLE IF NOT EXISTS global_price_history (id INTEGER PRIMARY KEY AUTOINCREMENT,product_id TEXT NOT NULL,source TEXT NOT NULL,price REAL NOT NULL,currency TEXT NOT NULL,shipping_price REAL,checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_global_offers_product_source ON global_offers(product_id,source);
CREATE INDEX IF NOT EXISTS idx_global_offers_checked ON global_offers(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_price_history_product_time ON global_price_history(product_id,checked_at DESC);


-- Automatically synchronized promo codes, coupons and vouchers
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
