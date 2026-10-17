-- Private Search Console monitoring. No public-facing endpoints or public data access.
CREATE TABLE IF NOT EXISTS gsc_state (name TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gsc_performance (dimension TEXT NOT NULL, item TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, clicks REAL NOT NULL, impressions REAL NOT NULL, ctr REAL NOT NULL, position REAL NOT NULL, checked_at TEXT NOT NULL, PRIMARY KEY (dimension,item,start_date,end_date));
CREATE TABLE IF NOT EXISTS gsc_url_inspections (url TEXT PRIMARY KEY, checked_at TEXT NOT NULL, verdict TEXT, coverage_state TEXT, indexing_state TEXT, robots_state TEXT, fetch_state TEXT, google_canonical TEXT, user_canonical TEXT, last_crawl TEXT);
CREATE TABLE IF NOT EXISTS gsc_sitemaps (path TEXT PRIMARY KEY, checked_at TEXT NOT NULL, last_submitted TEXT, last_downloaded TEXT, errors INTEGER, warnings INTEGER, pending INTEGER);
CREATE TABLE IF NOT EXISTS gsc_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL, completed_at TEXT, status TEXT NOT NULL, inspected INTEGER NOT NULL DEFAULT 0, performance_rows INTEGER NOT NULL DEFAULT 0, error_code TEXT);
