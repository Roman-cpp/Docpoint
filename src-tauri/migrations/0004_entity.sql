CREATE TABLE IF NOT EXISTS entities (
    id     TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
    name   TEXT NOT NULL,
    desc   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS entity_field (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT    NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    name      TEXT    NOT NULL,
    type      TEXT    NOT NULL,
    required  INTEGER NOT NULL DEFAULT 0,
    nullable  INTEGER NOT NULL DEFAULT 0,
    desc      TEXT    NOT NULL DEFAULT '',
    note      TEXT    NOT NULL DEFAULT '',
    example   TEXT    NOT NULL DEFAULT '',
    sort_ord  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS entity_field_enum (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    field_id INTEGER NOT NULL REFERENCES entity_field(id) ON DELETE CASCADE,
    val      TEXT    NOT NULL,
    desc     TEXT    NOT NULL DEFAULT ''
);
