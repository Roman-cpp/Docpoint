CREATE TABLE IF NOT EXISTS endpoint (
    id          TEXT    PRIMARY KEY,
    group_id    TEXT    NOT NULL REFERENCES endpoint_group(id) ON DELETE CASCADE,
    method      TEXT    NOT NULL CHECK(method IN ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS')),
    path        TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    auth        INTEGER NOT NULL DEFAULT 0,
    sort_ord    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS endpoint_tag (
    endpoint_id TEXT NOT NULL REFERENCES endpoint(id) ON DELETE CASCADE,
    tag         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS param (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id TEXT    NOT NULL REFERENCES endpoint(id) ON DELETE CASCADE,
    kind        TEXT    NOT NULL CHECK(kind IN ('query','body')),
    name        TEXT    NOT NULL,
    type        TEXT    NOT NULL,
    required    INTEGER NOT NULL DEFAULT 0,
    desc        TEXT    NOT NULL DEFAULT '',
    default_val TEXT,
    sort_ord    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS response (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id TEXT NOT NULL REFERENCES endpoint(id) ON DELETE CASCADE,
    status_code TEXT NOT NULL,
    label       TEXT NOT NULL,
    color       TEXT NOT NULL DEFAULT '',
    dot_color   TEXT NOT NULL DEFAULT '',
    example     TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS response_field (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id INTEGER NOT NULL REFERENCES response(id) ON DELETE CASCADE,
    key         TEXT    NOT NULL,
    type        TEXT    NOT NULL,
    desc        TEXT    NOT NULL DEFAULT '',
    example     TEXT,
    sort_ord    INTEGER NOT NULL DEFAULT 0
);
