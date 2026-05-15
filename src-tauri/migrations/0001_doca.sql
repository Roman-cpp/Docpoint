CREATE TABLE IF NOT EXISTS doca (
    id      TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    version TEXT NOT NULL,
    desc    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS doca_tag (
    doca_id TEXT NOT NULL REFERENCES doca(id) ON DELETE CASCADE,
    tag     TEXT NOT NULL
);
