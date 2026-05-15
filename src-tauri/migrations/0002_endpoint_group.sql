CREATE TABLE IF NOT EXISTS endpoint_group (
    id       TEXT    PRIMARY KEY,
    doca_id  TEXT    NOT NULL REFERENCES doca(id) ON DELETE CASCADE,
    label    TEXT    NOT NULL,
    sort_ord INTEGER NOT NULL DEFAULT 0
);
