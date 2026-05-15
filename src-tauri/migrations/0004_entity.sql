CREATE TABLE IF NOT EXISTS schema (
    id      TEXT PRIMARY KEY,
    doca_id TEXT NOT NULL REFERENCES doca(id) ON DELETE CASCADE,
    name    TEXT NOT NULL,
    desc    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS schema_field (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    schema_id TEXT    NOT NULL REFERENCES schema(id) ON DELETE CASCADE,
    name      TEXT    NOT NULL,
    type      TEXT    NOT NULL,
    required  INTEGER NOT NULL DEFAULT 0,
    nullable  INTEGER NOT NULL DEFAULT 0,
    desc      TEXT    NOT NULL DEFAULT '',
    note      TEXT    NOT NULL DEFAULT '',
    example   TEXT    NOT NULL DEFAULT '',
    sort_ord  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS schema_field_enum (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    field_id INTEGER NOT NULL REFERENCES schema_field(id) ON DELETE CASCADE,
    val      TEXT    NOT NULL,
    desc     TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS schema_used_by (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    schema_id TEXT NOT NULL REFERENCES schema(id) ON DELETE CASCADE,
    method    TEXT NOT NULL,
    path      TEXT NOT NULL,
    role      TEXT NOT NULL
);
