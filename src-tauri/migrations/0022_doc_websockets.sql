CREATE TABLE IF NOT EXISTS doc_websockets (
    id         TEXT PRIMARY KEY,
    service_id TEXT REFERENCES services(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    desc       TEXT NOT NULL DEFAULT '',
    url        TEXT NOT NULL DEFAULT '',   -- ws:// или wss:// endpoint
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS websocket_message (
    id           TEXT PRIMARY KEY,
    websocket_id TEXT NOT NULL REFERENCES doc_websockets(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,            -- "Subscribe", "Ping", "Auth"
    payload      TEXT NOT NULL DEFAULT '', -- JSON-шаблон
    desc         TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_websocket_message_websocket_id
    ON websocket_message(websocket_id);
