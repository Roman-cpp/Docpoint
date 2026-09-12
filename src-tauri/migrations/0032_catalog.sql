-- Единая группировка: каталоги и документы (doc-api, doc-ws, doc-erd, markdown)
-- становятся узлами одного дерева внутри платформы. Дерево заменяет собой сразу
-- две прежние группировки — домены (`domains`) и отдельное файловое дерево
-- markdown-файлов на диске (vault).
--
-- Данные сознательно не переносятся: имя и описание документа переезжают из его
-- собственной таблицы в узел дерева, а тела markdown лежали файлами вне БД, так
-- что строки старого образца в новую модель не ложатся. Платформы и окружения
-- остаются, содержимое документов удаляется.

PRAGMA foreign_keys = OFF;

-- ─── Дерево ──────────────────────────────────────────────────────────────────

-- Узел дерева. `kind` = 'catalog' — папка, остальные виды — документы; их
-- полезная нагрузка лежит в таблицах ниже и ссылается на узел по его id, так что
-- id узла и id документа — это одно и то же значение.
--
-- `parent_id IS NULL` означает корень платформы: отдельной строки-корня нет,
-- иначе каждый обход дерева начинался бы с особого случая.
CREATE TABLE catalog_node (
    id          TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    parent_id   TEXT REFERENCES catalog_node(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK(kind IN ('catalog', 'doc_api', 'doc_ws', 'doc_erd', 'markdown')),
    name        TEXT NOT NULL,
    desc        TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_catalog_node_parent ON catalog_node(platform_id, parent_id);

-- Имена уникальны среди соседей — как в проводнике. COALESCE подменяет NULL у
-- корневых узлов: в SQLite два NULL в UNIQUE-индексе считаются разными, и без
-- него корень остался бы без проверки.
CREATE UNIQUE INDEX idx_catalog_node_name
    ON catalog_node(platform_id, COALESCE(parent_id, ''), name);

-- ─── Чистый старт по документам ──────────────────────────────────────────────

DROP TABLE IF EXISTS domains;

DELETE FROM request_param_values;
DELETE FROM request_headers;
DELETE FROM endpoint_requests;
DELETE FROM response_field;
DELETE FROM response;
DELETE FROM param;
DELETE FROM endpoint_tag;
DELETE FROM endpoint;
DELETE FROM entity_field_enum;
DELETE FROM entity_field;
DELETE FROM entity_relation;

DROP TABLE docs_tag;
DROP TABLE "group";
DROP TABLE entities;
DROP TABLE websocket_message;
DROP TABLE docs;
DROP TABLE doc_erds;
DROP TABLE doc_websockets;

-- ─── Полезная нагрузка документов ────────────────────────────────────────────

-- Всё, что есть у doc-api сверх узла. Имя, описание и место в дереве живут в
-- catalog_node, здесь — только собственные поля документа.
CREATE TABLE doc_api (
    id      TEXT PRIMARY KEY REFERENCES catalog_node(id) ON DELETE CASCADE,
    version TEXT NOT NULL DEFAULT '',
    -- Дописывается после префикса окружения при сборке URL запроса.
    prefix  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE doc_api_tag (
    doc_id TEXT NOT NULL REFERENCES doc_api(id) ON DELETE CASCADE,
    tag    TEXT NOT NULL
);

CREATE TABLE doc_ws (
    id  TEXT PRIMARY KEY REFERENCES catalog_node(id) ON DELETE CASCADE,
    -- `ws://` или `wss://` адрес подключения.
    url TEXT NOT NULL DEFAULT ''
);

-- doc-erd и markdown своих таблиц не имеют: диаграмма целиком описывается
-- entities/entity_relation, а тело markdown лежит файлом <id>.md в content-каталоге.

-- ─── Содержимое документов, пересобранное на новые ссылки ────────────────────

CREATE TABLE "group" (
    id       TEXT    PRIMARY KEY,
    doc_id   TEXT    NOT NULL REFERENCES doc_api(id) ON DELETE CASCADE,
    label    TEXT    NOT NULL,
    sort_ord INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE entities (
    id         TEXT PRIMARY KEY,
    -- Схема doc-api. NULL у сущности, заведённой прямо на холсте ERD.
    doc_id     TEXT REFERENCES doc_api(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    desc       TEXT NOT NULL DEFAULT '',
    -- Узел-диаграмма, на которой сущность отображается.
    doc_erd_id TEXT REFERENCES catalog_node(id) ON DELETE SET NULL
);

CREATE TABLE websocket_message (
    id           TEXT PRIMARY KEY,
    websocket_id TEXT NOT NULL REFERENCES doc_ws(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,            -- "Subscribe", "Ping", "Auth"
    payload      TEXT NOT NULL DEFAULT '', -- JSON-шаблон
    desc         TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_websocket_message_websocket_id
    ON websocket_message(websocket_id);

PRAGMA foreign_keys = ON;
