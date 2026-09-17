-- URL-параметры переезжают в свою таблицу.
--
-- В `param` сегменты пути, параметры строки запроса и поля тела лежали вместе,
-- хотя это разные вещи. Сегмент и query-параметр — плоская пара «имя-значение»,
-- такими они и останутся. Тело — вложенный JSON, и плоским списком его не
-- описать: тип `object` в строке параметра говорит «здесь объект» и молчит о
-- том, что внутри. Тело уезжает в документ со своими примечаниями следующей
-- миграцией, а здесь остаётся ровно то, что действительно плоское.
--
-- Пересборка идёт внутри обычной транзакции: на `param` никто не ссылается
-- внешним ключом, поэтому `PRAGMA foreign_keys = OFF` (а с ним и
-- `-- no-transaction`) не нужен — разбор правила в комментарии к 0031.

CREATE TABLE endpoint_url_param (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id TEXT    NOT NULL REFERENCES endpoint(id) ON DELETE CASCADE,
    kind        TEXT    NOT NULL CHECK (kind IN ('path','query')),
    name        TEXT    NOT NULL,
    type        TEXT    NOT NULL,
    required    INTEGER NOT NULL DEFAULT 0,
    desc        TEXT    NOT NULL DEFAULT '',
    default_val TEXT,
    -- Имя переменной окружения, закреплённой за параметром в панели «Try it».
    value       TEXT    NOT NULL DEFAULT '',
    sort_ord    INTEGER NOT NULL DEFAULT 0,
    -- Двух одноимённых параметров одного вида у эндпоинта быть не может:
    -- значение подставляется по имени, и дубль означал бы спор о том, какое
    -- описание настоящее.
    UNIQUE (endpoint_id, kind, name)
);

CREATE INDEX idx_endpoint_url_param
    ON endpoint_url_param (endpoint_id, kind, sort_ord);

INSERT INTO endpoint_url_param
    (endpoint_id, kind, name, type, required, desc, default_val, value, sort_ord)
SELECT endpoint_id, kind, name, type, required, desc, default_val, value, sort_ord
FROM param
WHERE kind IN ('path', 'query');

-- Сверка до сноса: если хоть одна строка не переехала, миграция падает здесь,
-- а не теряет описание молча. CHECK на временной таблице — единственный способ
-- прервать миграцию из чистого SQL: RAISE() в SQLite работает только внутри
-- триггера.
CREATE TABLE _url_param_guard (lost INTEGER NOT NULL CHECK (lost = 0));
INSERT INTO _url_param_guard (lost)
SELECT (SELECT COUNT(*) FROM param WHERE kind IN ('path', 'query'))
     - (SELECT COUNT(*) FROM endpoint_url_param);
DROP TABLE _url_param_guard;

DELETE FROM param WHERE kind IN ('path', 'query');
