CREATE TABLE IF NOT EXISTS http_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL DEFAULT '',
    method     TEXT    NOT NULL,
    url        TEXT    NOT NULL,
    status     INTEGER NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
