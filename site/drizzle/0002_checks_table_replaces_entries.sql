DROP TABLE entries;
--> statement-breakpoint
CREATE TABLE checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  verdict TEXT NOT NULL,
  score INTEGER NOT NULL,
  signals TEXT NOT NULL,
  contracts TEXT NOT NULL,
  page_title TEXT,
  final_url TEXT,
  http_status INTEGER,
  registered_at TEXT,
  registrar TEXT,
  domain_age_days INTEGER,
  created_at INTEGER NOT NULL
);
