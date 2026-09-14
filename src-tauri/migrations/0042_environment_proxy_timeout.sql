-- Таймаут HTTP-запроса окружения: без него медленный или зависший сервер держит
-- запрос вечно, поскольку клиент `reqwest` собирается без таймаута по
-- умолчанию. `0` — таймаут не задан, ведёт себя как сейчас.
ALTER TABLE environment_proxy
    ADD COLUMN timeout_ms INTEGER NOT NULL DEFAULT 0;
