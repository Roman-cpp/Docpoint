CREATE TABLE IF NOT EXISTS services (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    desc        TEXT NOT NULL DEFAULT '',
    platform_id TEXT REFERENCES platforms(id) ON DELETE CASCADE
);
