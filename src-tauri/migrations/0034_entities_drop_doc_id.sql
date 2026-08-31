-- no-transaction
-- Сущность принадлежит только ERD-диаграмме.
--
-- Колонка doc_id осталась от прежней модели, где схемы жили внутри API-
-- документа. После перехода на дерево каталогов (0032) завести такую сущность
-- стало нечем: интерфейса для них нет, из живого на doc_id смотрел только
-- счётчик «Resources» на обзорной странице документа. Держать вторую, никем не
-- заполняемую принадлежность значит держать и развилку во всех запросах к
-- таблице.
--
-- Строки, привязанные к документу, удаляются: без doc_id им некуда деться —
-- сущность без диаграммы нигде не показывается, а её поля и связи всё равно
-- висели бы мусором.
--
-- Без транзакции, чтобы `PRAGMA foreign_keys = OFF` действительно подействовал:
-- иначе DROP TABLE entities каскадом снёс бы все entity_field и
-- entity_relation, которые на неё ссылаются.
PRAGMA foreign_keys = OFF;

DELETE FROM entity_field_enum
WHERE field_id IN (
    SELECT f.id FROM entity_field f
    JOIN entities e ON e.id = f.entity_id
    WHERE e.doc_erd_id IS NULL
);

DELETE FROM entity_field
WHERE entity_id IN (SELECT id FROM entities WHERE doc_erd_id IS NULL);

DELETE FROM entity_relation
WHERE from_entity IN (SELECT id FROM entities WHERE doc_erd_id IS NULL)
   OR to_entity IN (SELECT id FROM entities WHERE doc_erd_id IS NULL);

DELETE FROM entities WHERE doc_erd_id IS NULL;

CREATE TABLE entities_new (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    desc       TEXT NOT NULL DEFAULT '',
    -- Узел-диаграмма, на которой сущность отображается.
    doc_erd_id TEXT REFERENCES catalog_node(id) ON DELETE SET NULL,
    -- Положение на холсте; NULL — сущность ещё ни разу не размещали (0033).
    pos_x      REAL,
    pos_y      REAL
);

INSERT INTO entities_new (id, name, desc, doc_erd_id, pos_x, pos_y)
SELECT id, name, desc, doc_erd_id, pos_x, pos_y FROM entities;

DROP TABLE entities;
ALTER TABLE entities_new RENAME TO entities;

PRAGMA foreign_key_check;
PRAGMA foreign_keys = ON;
