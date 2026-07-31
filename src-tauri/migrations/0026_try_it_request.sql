-- Тело запроса можно задавать двумя способами: по полям схемы эндпоинта
-- ('fields') или сырым JSON, который уходит на сервер без обработки ('raw').
-- Оба варианта хранятся одновременно, переключение режима ничего не теряет.
ALTER TABLE endpoint_requests ADD COLUMN body_mode TEXT NOT NULL DEFAULT 'fields';
ALTER TABLE endpoint_requests ADD COLUMN raw_body  TEXT NOT NULL DEFAULT '';

-- Произвольные заголовки набора. Отдельная таблица, а не kind в
-- request_param_values: заголовки не описаны в схеме эндпоинта, у них есть
-- собственный порядок и флаг «отправлять / не отправлять».
CREATE TABLE IF NOT EXISTS request_headers (
    id         TEXT    PRIMARY KEY,
    request_id TEXT    NOT NULL REFERENCES endpoint_requests(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    value      TEXT    NOT NULL DEFAULT '',
    enabled    INTEGER NOT NULL DEFAULT 1,
    sort_ord   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_request_headers_request_id
    ON request_headers(request_id);
