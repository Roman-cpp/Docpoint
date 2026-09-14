CREATE TABLE IF NOT EXISTS "group" (
    id       TEXT    PRIMARY KEY,
    doc_id  TEXT    NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
    label    TEXT    NOT NULL,
    sort_ord INTEGER NOT NULL DEFAULT 0
);
