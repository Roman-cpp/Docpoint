-- Сегменты пути становятся описываемыми параметрами.
--
-- До этой миграции `param.kind` знал только query и body, поэтому у сегмента
-- `/posts/{postId}` не было ни типа, ни описания, ни пометки об
-- обязательности: панель «Try it» выводила его по самому пути как безымянное
-- обязательное поле, а документация не могла сказать, что там ожидается.
--
-- CHECK в SQLite не меняется на месте, таблицу приходится пересобирать. Здесь
-- это безопасно и внутри транзакции: на `param` не ссылается никто, ссылается
-- только она сама — на `endpoint`, а перенос строк идёт вместе со всеми
-- значениями, включая id (AUTOINCREMENT продолжится с прежнего места).
CREATE TABLE param_new (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id TEXT    NOT NULL REFERENCES endpoint(id) ON DELETE CASCADE,
    kind        TEXT    NOT NULL CHECK(kind IN ('path','query','body')),
    name        TEXT    NOT NULL,
    type        TEXT    NOT NULL,
    required    INTEGER NOT NULL DEFAULT 0,
    desc        TEXT    NOT NULL DEFAULT '',
    default_val TEXT,
    value       TEXT    NOT NULL DEFAULT '',
    sort_ord    INTEGER NOT NULL DEFAULT 0
);

INSERT INTO param_new
    (id, endpoint_id, kind, name, type, required, desc, default_val, value, sort_ord)
SELECT id, endpoint_id, kind, name, type, required, desc, default_val, value, sort_ord
FROM param;

DROP TABLE param;
ALTER TABLE param_new RENAME TO param;
