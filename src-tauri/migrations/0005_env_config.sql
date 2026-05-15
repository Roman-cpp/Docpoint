CREATE TABLE IF NOT EXISTS env_config (
    id       TEXT PRIMARY KEY,
    doca_id  TEXT NOT NULL REFERENCES doca(id) ON DELETE CASCADE,
    env      TEXT NOT NULL,
    label    TEXT NOT NULL,
    dot      TEXT NOT NULL DEFAULT '',
    base_url TEXT NOT NULL
);
