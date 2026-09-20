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
