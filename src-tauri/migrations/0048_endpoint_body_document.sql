-- Тело запроса перестаёт быть плоским списком полей.
--
-- В `param` тело описывалось так же, как строка запроса: по строке на поле с
-- именем и типом. Для вложенного JSON этого не хватает — тип `object` говорит
-- «здесь объект» и молчит о том, что внутри, а описать `meta.estimate.unit`
-- нечем вовсе. Теперь структура тела хранится целиком, одним JSON-документом:
-- он сам задаёт и форму, и типы значений, а фронтенд разбирает его там, где
-- нужно.
--
-- Рядом — примечания по пути поля: описание, обязательность и уточнение типа.
-- В таблице только то, чего сам JSON о себе не рассказывает: что `"id": ""` —
-- это uuid, что поле обязательно и зачем оно нужно.
--
-- Колонкой у эндпоинта, а не таблицей 1:1: тело у эндпоинта ровно одно, и это
-- повторение решения 0030, где тело набора «Try it» стало колонкой
-- `endpoint_requests.body`. `CHECK(json_valid(body))` намеренно нет: тело
-- бывает и не JSON (form-urlencoded), и запрет превратил бы такой эндпоинт в
-- неописуемый.

ALTER TABLE endpoint ADD COLUMN body TEXT NOT NULL DEFAULT '';

CREATE TABLE endpoint_body_field (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id TEXT    NOT NULL REFERENCES endpoint(id) ON DELETE CASCADE,
    -- Путь к полю внутри документа: `title`, `meta.total`, `data[].id`.
    path        TEXT    NOT NULL,
    -- Уточнение типа, которого JSON не различает: uuid, datetime, integer.
    -- Пусто — тип виден в самом документе.
    format      TEXT    NOT NULL DEFAULT '',
    required    INTEGER NOT NULL DEFAULT 0,
    desc        TEXT    NOT NULL DEFAULT '',
    sort_ord    INTEGER NOT NULL DEFAULT 0,
    -- Два примечания на один путь означали бы спор о том, какое настоящее.
    UNIQUE (endpoint_id, path)
);

-- ─── Плоские поля сворачиваются в документ ───────────────────────────────────
-- Значение поля — его умолчание, если оно задано, иначе образец по типу. Набор
-- образцов повторяет `sampleValue` из `request-preview.ts`, чтобы документ и
-- пример вызова говорили одно и то же.
--
-- `ORDER BY` внутри `json_group_object` сохраняет порядок полей (SQLite 3.44+).
UPDATE endpoint SET body = COALESCE((
    SELECT json_group_object(p.name, json(CASE
        WHEN p.default_val IS NOT NULL AND trim(p.default_val) <> '' THEN CASE
            WHEN lower(p.type) IN ('integer', 'int', 'long', 'number', 'float', 'double')
                 AND trim(p.default_val) NOT GLOB '*[^0-9.eE+-]*'   THEN trim(p.default_val)
            WHEN lower(p.type) IN ('boolean', 'bool')
                 AND lower(trim(p.default_val)) IN ('true', 'false') THEN lower(trim(p.default_val))
            ELSE json_quote(p.default_val) END
        WHEN lower(p.type) = 'object'                                THEN '{}'
        WHEN lower(p.type) = 'array'                                 THEN '[]'
        WHEN lower(p.type) IN ('boolean', 'bool')                    THEN 'true'
        WHEN lower(p.type) IN ('integer', 'int', 'long', 'number', 'float', 'double') THEN '0'
        WHEN lower(p.type) = 'uuid'
            THEN json_quote('00000000-0000-0000-0000-000000000000')
        WHEN lower(p.type) IN ('datetime', 'date-time')
            THEN json_quote('2026-01-01T00:00:00Z')
        WHEN lower(p.type) = 'date'                                  THEN json_quote('2026-01-01')
        ELSE json_quote('<' || p.name || '>') END)
        ORDER BY p.sort_ord)
    FROM param p
    WHERE p.endpoint_id = endpoint.id AND p.kind = 'body'
), '')
WHERE EXISTS (SELECT 1 FROM param WHERE endpoint_id = endpoint.id AND kind = 'body');

-- ─── Описания переезжают в примечания ────────────────────────────────────────
-- В `format` попадает только то, чего документ сказать не может. `string`,
-- `boolean`, `object` и `array` видны по самому значению, поэтому уточнение у
-- них пустое.
INSERT INTO endpoint_body_field (endpoint_id, path, format, required, desc, sort_ord)
SELECT endpoint_id, name,
       CASE lower(type)
           WHEN 'uuid' THEN 'uuid'
           WHEN 'datetime' THEN 'datetime'
           WHEN 'date-time' THEN 'datetime'
           WHEN 'date' THEN 'date'
           WHEN 'email' THEN 'email'
           WHEN 'integer' THEN 'integer'
           WHEN 'int' THEN 'integer'
           WHEN 'long' THEN 'integer'
           ELSE '' END,
       required, desc, sort_ord
FROM param
WHERE kind = 'body';

-- Сверка до сноса: каждое поле стало примечанием, и у каждого эндпоинта с
-- телом документ собрался и разбирается как JSON. Нарушение CHECK откатывает
-- миграцию целиком — см. тот же приём в 0047.
CREATE TABLE _body_guard (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO _body_guard (ok)
SELECT CASE WHEN
        (SELECT COUNT(*) FROM endpoint_body_field)
            = (SELECT COUNT(*) FROM param WHERE kind = 'body')
    AND NOT EXISTS (
        SELECT 1 FROM endpoint e
        WHERE EXISTS (SELECT 1 FROM param WHERE endpoint_id = e.id AND kind = 'body')
          AND (e.body = '' OR json_valid(e.body) = 0))
    THEN 1 ELSE 0 END;
DROP TABLE _body_guard;

-- Плоских параметров больше нет ни одного вида: путь и строка запроса уехали в
-- `endpoint_url_param` миграцией 0047, тело — в документ выше.
DROP TABLE param;
