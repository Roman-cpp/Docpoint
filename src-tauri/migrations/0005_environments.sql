CREATE TABLE IF NOT EXISTS environments (
    id       TEXT PRIMARY KEY,
    doc_id  TEXT NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
    env      TEXT NOT NULL,
    label    TEXT NOT NULL,
    dot      TEXT NOT NULL DEFAULT '',
    base_url TEXT NOT NULL,
    prefix   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS variables (
    id              TEXT PRIMARY KEY,
    environments_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key             TEXT NOT NULL,
    value           TEXT NOT NULL DEFAULT ''
);
