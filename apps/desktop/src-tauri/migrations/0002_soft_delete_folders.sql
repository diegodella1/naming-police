ALTER TABLE watched_folders
  ADD COLUMN is_removed INTEGER NOT NULL DEFAULT 0 CHECK (is_removed IN (0,1));
