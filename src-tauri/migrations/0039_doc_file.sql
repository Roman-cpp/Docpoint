-- no-transaction
-- В дерево можно положить любой файл с диска.
--
-- Пятый вид документа — `file`: сам файл лежит в хранилище приложения, а узел
-- даёт ему имя и место в дереве, как и остальным документам. Открывается он не
-- страницей, а той программой, которой файл этого типа открывается в системе,
-- поэтому своих полей у него ровно два: под каким именем файл лёг на диск и
-- сколько он весит.
--
-- `kind` ограничен списком, а список задан CHECK-ограничением, которое в SQLite
-- нельзя изменить на месте — отсюда пересборка таблицы. Данные переносятся
-- один в один.
PRAGMA foreign_keys = OFF;

CREATE TABLE catalog_node_new (
    id          TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    parent_id   TEXT REFERENCES catalog_node(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK(kind IN ('catalog', 'doc_api', 'doc_ws', 'doc_erd', 'markdown', 'file')),
    name        TEXT NOT NULL,
    desc        TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO catalog_node_new (id, platform_id, parent_id, kind, name, desc, created_at, updated_at)
SELECT id, platform_id, parent_id, kind, name, desc, created_at, updated_at FROM catalog_node;

DROP TABLE catalog_node;
ALTER TABLE catalog_node_new RENAME TO catalog_node;

CREATE INDEX idx_catalog_node_parent ON catalog_node(platform_id, parent_id);

CREATE UNIQUE INDEX idx_catalog_node_name
    ON catalog_node(platform_id, COALESCE(parent_id, ''), name);

-- Всё, что есть у загруженного файла сверх узла. `filename` — имя, под которым
-- файл лежит в каталоге узла: переименование документа в дереве его не трогает,
-- поэтому программа открывает файл под тем же именем, под каким он пришёл.
CREATE TABLE doc_file (
    id       TEXT    PRIMARY KEY REFERENCES catalog_node(id) ON DELETE CASCADE,
    filename TEXT    NOT NULL,
    size     INTEGER NOT NULL DEFAULT 0
);

PRAGMA foreign_key_check;
PRAGMA foreign_keys = ON;
