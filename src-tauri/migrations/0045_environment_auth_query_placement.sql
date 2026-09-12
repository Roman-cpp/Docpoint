-- `token_placement` умел только `header`/`cookie`, а многие REST API отдают
-- токен через query-параметр (`?api_key=…`) и для обычных HTTP-запросов, не
-- только для WebSocket-рукопожатия (там `ws_token_placement` это уже умеет).
-- SQLite не даёт поменять CHECK существующей колонки через ALTER — расширяем
-- набор значений через новую колонку с нужным CHECK, копируем данные, старую
-- убираем и переименовываем на её место.
ALTER TABLE environment_auth
    ADD COLUMN token_placement_new TEXT NOT NULL DEFAULT 'header'
        CHECK (token_placement_new IN ('header', 'cookie', 'query'));

UPDATE environment_auth SET token_placement_new = token_placement;

ALTER TABLE environment_auth DROP COLUMN token_placement;

ALTER TABLE environment_auth RENAME COLUMN token_placement_new TO token_placement;
