-- Заголовки и куки становятся описываемыми параметрами, а у наборов «Try it»
-- появляются свои куки.
--
-- Плоский параметр запроса — это пара «имя-значение», и всё различие между
-- сегментом пути, параметром строки запроса, заголовком и кукой в том, куда
-- он едет. Ровно так на них смотрит и OpenAPI: один объект `parameter` с
-- полем `in`. Поэтому таблица одна, а `kind` теперь знает четыре места.
--
-- Имя `endpoint_url_param` перестало быть верным: заголовок в URL не попадает.
-- CHECK в SQLite на месте не меняется, таблицу всё равно пересобирать — заодно
-- и переименовываем.
--
-- Пересборка идёт внутри транзакции: на таблицу никто не ссылается внешним
-- ключом (разбор правила — в комментарии к 0031).

CREATE TABLE endpoint_param (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id TEXT    NOT NULL REFERENCES endpoint(id) ON DELETE CASCADE,
    -- Куда параметр едет в запросе — то же, что `in` у OpenAPI.
    kind        TEXT    NOT NULL CHECK (kind IN ('path', 'query', 'header', 'cookie')),
    name        TEXT    NOT NULL,
    type        TEXT    NOT NULL,
    required    INTEGER NOT NULL DEFAULT 0,
    desc        TEXT    NOT NULL DEFAULT '',
    default_val TEXT,
    -- Имя переменной окружения, закреплённой за параметром в панели «Try it».
    value       TEXT    NOT NULL DEFAULT '',
    sort_ord    INTEGER NOT NULL DEFAULT 0,
    UNIQUE (endpoint_id, kind, name)
);

CREATE INDEX idx_endpoint_param ON endpoint_param (endpoint_id, kind, sort_ord);

INSERT INTO endpoint_param
    (id, endpoint_id, kind, name, type, required, desc, default_val, value, sort_ord)
SELECT id, endpoint_id, kind, name, type, required, desc, default_val, value, sort_ord
FROM endpoint_url_param;

CREATE TABLE _param_guard (lost INTEGER NOT NULL CHECK (lost = 0));
INSERT INTO _param_guard (lost)
SELECT (SELECT COUNT(*) FROM endpoint_url_param) - (SELECT COUNT(*) FROM endpoint_param);
DROP TABLE _param_guard;

DROP TABLE endpoint_url_param;

-- ─── Куки набора «Try it» ────────────────────────────────────────────────────
-- Отдельная таблица, а не заголовок `Cookie` строкой: у каждой куки свой флаг
-- «отправлять / не отправлять» и своё место в списке, как у заголовков. В
-- заголовок они собираются при отправке — там же, где к ним домешивается
-- сессия окружения.
CREATE TABLE request_cookie (
    id         TEXT    PRIMARY KEY,
    request_id TEXT    NOT NULL REFERENCES endpoint_requests(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    value      TEXT    NOT NULL DEFAULT '',
    enabled    INTEGER NOT NULL DEFAULT 1,
    sort_ord   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_request_cookie_request_id ON request_cookie (request_id);
