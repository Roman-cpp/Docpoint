CREATE TABLE IF NOT EXISTS docs (
    id      TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    version TEXT NOT NULL,
    desc    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS docs_tag (
    doc_id TEXT NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
    tag     TEXT NOT NULL
);
