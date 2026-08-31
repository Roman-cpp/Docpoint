-- no-transaction
-- У диаграммы появляется своя строка — как у doc-api и doc-ws.
--
-- До этой миграции doc-erd был единственным документом, у которого таблицы не
-- было: сущности ссылались прямо на узел дерева. Ссылка на `catalog_node` не
-- отличает диаграмму от каталога или markdown-файла, поэтому целостность здесь
-- держалась только на том, что в `doc_erd_id` никто не запишет чужой id.
-- Отдельная таблица делает это утверждение проверяемым и даёт место
-- собственным полям диаграммы, когда они появятся.
--
-- Имя и описание остаются в узле: у документа одно имя, и переименование идёт
-- одним путём для всех видов.
PRAGMA foreign_keys = OFF;

CREATE TABLE doc_erd (
    id TEXT PRIMARY KEY REFERENCES catalog_node(id) ON DELETE CASCADE
);

INSERT INTO doc_erd (id) SELECT id FROM catalog_node WHERE kind = 'doc_erd';

-- Сущности без диаграммы: прежний ON DELETE SET NULL оставлял их после
-- удаления узла, и с тех пор они лежали мёртвым грузом — сущность вне
-- диаграммы нигде не показывается. Дальше такого не будет: связь становится
-- обязательной, а удаление диаграммы уносит её таблицы каскадом.
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
    -- Диаграмма, на которой живёт сущность. Своей диаграммы у неё быть не может.
    doc_erd_id TEXT NOT NULL REFERENCES doc_erd(id) ON DELETE CASCADE,
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
