-- Схемы ответов переезжают на ту же модель, что и тело запроса.
--
-- Структура ответа была описана дважды: плоским списком полей с путём в ключе
-- (`data[].id`) и примером JSON рядом. Два источника правды разошлись — из 1608
-- описанных полей 180 не встречаются в примере своего ответа.
--
-- Теперь источник один. Пример и есть структура: `response.example`
-- переименовывается в `body`, а `response_field` становится примечаниями того
-- же вида, что у тела запроса, — путь, описание, обязательность и уточнение
-- типа. Значение поля живёт в документе и в примечании больше не дублируется.
--
-- Примечание, чьего пути в документе нет, остаётся: так описывают
-- необязательное поле, которого в конкретном примере намеренно не оказалось.
-- Страница показывает такие отдельной строкой, а не прячет.
--
-- Пересборка идёт внутри транзакции: на `response_field` никто не ссылается
-- внешним ключом (разбор правила — в комментарии к 0031).

ALTER TABLE response RENAME COLUMN example TO body;

-- ─── Значения полей переезжают в документ ────────────────────────────────────
-- У части полей пример стоит на пути, которого в документе нет, — это
-- единственные значения, которых документ ещё не знает. Они вживляются на своё
-- место, но только если ветка под них уже есть: `json_set` охотно достроил бы
-- и её, а выдумывать структуру нельзя. Поле, у которого и ветки нет, остаётся
-- примечанием без места — на странице оно видно отдельной строкой.
--
-- `json_set` работает по одному пути за раз, поэтому ответы с несколькими
-- такими полями обрабатываются рекурсией. Номер шага считается ПОСЛЕ отбора
-- недостающих: нумерация по всем полям оставила бы дыры, и цепочка порвалась
-- бы на первой же.
WITH addressed AS (
    SELECT f.response_id AS rid,
           f.example AS val,
           r.body AS doc,
           '$' || CASE WHEN f.key LIKE '[]%' THEN '' ELSE '.' END
                || replace(f.key, '[]', '[0]') AS path
    FROM response_field f
    JOIN response r ON r.id = f.response_id
    WHERE json_valid(r.body)
      AND f.example IS NOT NULL
      AND trim(f.example) <> ''
      AND json_valid(f.example)
),
missing AS (
    SELECT rid, val, path
    FROM addressed
    WHERE json_type(doc, path) IS NULL
      -- Родитель пути: всё до последней точки. Нет родителя — нет и места.
      AND json_type(doc, rtrim(rtrim(path, replace(path, '.', '')), '.')) IS NOT NULL
),
numbered AS (
    SELECT rid, val, path,
           ROW_NUMBER() OVER (PARTITION BY rid ORDER BY path) AS step
    FROM missing
),
grafted(rid, step, doc) AS (
    SELECT r.id, 0, r.body FROM response r WHERE r.id IN (SELECT rid FROM numbered)
    UNION ALL
    SELECT g.rid, n.step, json_set(g.doc, n.path, json(n.val))
    FROM grafted g
    JOIN numbered n ON n.rid = g.rid AND n.step = g.step + 1
)
UPDATE response SET body = (
    SELECT doc FROM grafted g WHERE g.rid = response.id ORDER BY g.step DESC LIMIT 1
)
WHERE id IN (SELECT rid FROM numbered);

-- ─── Поля становятся примечаниями ────────────────────────────────────────────
-- Колонки те же, что у примечаний к телу запроса: описывают они одно и то же, и
-- читает их один и тот же код.
CREATE TABLE response_field_new (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id INTEGER NOT NULL REFERENCES response(id) ON DELETE CASCADE,
    path        TEXT    NOT NULL,
    format      TEXT    NOT NULL DEFAULT '',
    required    INTEGER NOT NULL DEFAULT 0,
    desc        TEXT    NOT NULL DEFAULT '',
    sort_ord    INTEGER NOT NULL DEFAULT 0,
    UNIQUE (response_id, path)
);

-- `required` заводится нулём: у полей ответа такого признака не было, и
-- выдумывать его нечем. Страница помечает только обязательные, поэтому
-- ненастроенное поле ни о чём не врёт.
INSERT INTO response_field_new (response_id, path, format, required, desc, sort_ord)
SELECT response_id, key,
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
       0, desc, sort_ord
FROM response_field;

-- Сверка до сноса: все поля стали примечаниями и ни одно значение не осталось
-- без места в документе.
CREATE TABLE _response_guard (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO _response_guard (ok)
SELECT CASE WHEN
        (SELECT COUNT(*) FROM response_field_new) = (SELECT COUNT(*) FROM response_field)
    AND NOT EXISTS (
        SELECT 1
        FROM response_field f
        JOIN response r ON r.id = f.response_id
        WHERE json_valid(r.body)
          AND f.example IS NOT NULL AND trim(f.example) <> '' AND json_valid(f.example)
          AND json_type(
                  r.body,
                  '$' || CASE WHEN f.key LIKE '[]%' THEN '' ELSE '.' END
                       || replace(f.key, '[]', '[0]')
              ) IS NULL
          AND json_type(
                  r.body,
                  rtrim(
                      rtrim(
                          '$' || CASE WHEN f.key LIKE '[]%' THEN '' ELSE '.' END
                               || replace(f.key, '[]', '[0]'),
                          replace(
                              '$' || CASE WHEN f.key LIKE '[]%' THEN '' ELSE '.' END
                                   || replace(f.key, '[]', '[0]'),
                              '.', ''
                          )
                      ),
                      '.'
                  )
              ) IS NOT NULL)
    THEN 1 ELSE 0 END;
DROP TABLE _response_guard;

DROP TABLE response_field;
ALTER TABLE response_field_new RENAME TO response_field;
