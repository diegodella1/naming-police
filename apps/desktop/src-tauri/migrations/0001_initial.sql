PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watched_folders (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  preset TEXT NOT NULL CHECK (preset IN ('general','screenshots','travel_photos','invoices','custom')),
  mode TEXT NOT NULL CHECK (mode IN ('observe','ask','automatic')),
  is_paused INTEGER NOT NULL DEFAULT 0 CHECK (is_paused IN (0,1)),
  pause_until TEXT,
  include_subfolders INTEGER NOT NULL DEFAULT 1 CHECK (include_subfolders IN (0,1)),
  extensions_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  decisions INTEGER NOT NULL DEFAULT 0,
  accepted_unchanged INTEGER NOT NULL DEFAULT 0,
  recent_undos INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL REFERENCES watched_folders(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  file_identity TEXT,
  content_hash TEXT,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_detail TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(folder_id, path, content_hash)
);

CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status, updated_at);
CREATE INDEX IF NOT EXISTS jobs_folder_idx ON jobs(folder_id, status);

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL REFERENCES watched_folders(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  current_name TEXT NOT NULL,
  proposed_name TEXT NOT NULL,
  file_kind TEXT NOT NULL,
  thumbnail_data_url TEXT,
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  explanation TEXT NOT NULL,
  sources_json TEXT NOT NULL,
  collision INTEGER NOT NULL DEFAULT 0 CHECK (collision IN (0,1)),
  status TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE INDEX IF NOT EXISTS suggestions_status_idx ON suggestions(status, created_at DESC);

CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY,
  suggestion_id TEXT REFERENCES suggestions(id) ON DELETE SET NULL,
  folder_id TEXT NOT NULL REFERENCES watched_folders(id) ON DELETE RESTRICT,
  old_path TEXT NOT NULL,
  new_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('rename','undo')),
  status TEXT NOT NULL CHECK (status IN ('planned','fs_done','committed','failed')),
  parent_operation_id TEXT REFERENCES operations(id),
  error TEXT,
  created_at TEXT NOT NULL,
  committed_at TEXT
);

CREATE INDEX IF NOT EXISTS operations_created_idx ON operations(created_at DESC);
CREATE INDEX IF NOT EXISTS operations_status_idx ON operations(status);

CREATE TABLE IF NOT EXISTS analysis_cache (
  content_hash TEXT NOT NULL,
  preset TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  model TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(content_hash, preset, schema_version, model)
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
