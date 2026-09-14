CREATE TABLE IF NOT EXISTS environment_auth (
    id             TEXT PRIMARY KEY,
    environment_id TEXT NOT NULL UNIQUE REFERENCES environments(id) ON DELETE CASCADE,
    url            TEXT NOT NULL DEFAULT '',
    method         TEXT NOT NULL DEFAULT 'POST',
    body           TEXT NOT NULL DEFAULT '',
    token_path     TEXT NOT NULL DEFAULT '',
    access_token   TEXT
);
