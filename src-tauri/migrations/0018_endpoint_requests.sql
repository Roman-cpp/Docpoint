-- Сохранённые наборы параметров (presets) для эндпоинта: один эндпоинт может
-- хранить несколько независимых комплектов значений параметров — по одному
-- набору на запись. Между наборами можно переключаться в панели "Try it".
CREATE TABLE IF NOT EXISTS endpoint_requests (
    id          TEXT    PRIMARY KEY,
    endpoint_id TEXT    NOT NULL REFERENCES endpoint(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL DEFAULT '',   -- "Prod smoke", "Empty body" и т.п.
    sort_ord    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_endpoint_requests_endpoint_id
    ON endpoint_requests(endpoint_id);

-- Конкретное значение параметра в рамках набора. Ключуется по (kind, name),
-- а не по param.id: path-параметры не хранятся в таблице param (их извлекают
-- из строки пути), а фронт матчит параметры по kind+name.
CREATE TABLE IF NOT EXISTS request_param_values (
    request_id TEXT NOT NULL REFERENCES endpoint_requests(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK(kind IN ('path','query','body')),
    name       TEXT NOT NULL,
    value      TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (request_id, kind, name)
);
