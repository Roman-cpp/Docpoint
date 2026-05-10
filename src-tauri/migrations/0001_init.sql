-- ─────────────────────────────────────────
-- DOCA
-- ─────────────────────────────────────────
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

-- ─────────────────────────────────────────
-- GROUPS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS endpoint_group (
    id       TEXT    PRIMARY KEY,
    doca_id  TEXT    NOT NULL REFERENCES doca(id) ON DELETE CASCADE,
    label    TEXT    NOT NULL,
    sort_ord INTEGER NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────
-- ENDPOINTS
-- ─────────────────────────────────────────
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

-- ─────────────────────────────────────────
-- PARAMS  (query | body)
-- ─────────────────────────────────────────
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

-- ─────────────────────────────────────────
-- RESPONSES
-- ─────────────────────────────────────────
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

-- ─────────────────────────────────────────
-- SCHEMAS
-- ─────────────────────────────────────────
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

-- ─────────────────────────────────────────
-- ENV CONFIGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS env_config (
    id       TEXT PRIMARY KEY,
    doca_id  TEXT NOT NULL REFERENCES doca(id) ON DELETE CASCADE,
    env      TEXT NOT NULL,
    label    TEXT NOT NULL,
    dot      TEXT NOT NULL DEFAULT '',
    base_url TEXT NOT NULL
);

-- ─────────────────────────────────────────
-- HTTP CLIENT HISTORY
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS http_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL DEFAULT '',
    method     TEXT    NOT NULL,
    url        TEXT    NOT NULL,
    status     INTEGER NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
