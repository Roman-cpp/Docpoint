-- no-transaction
-- ERD-only entities have no owning API doc — they belong to a diagram via
-- doc_erd_id (migration 0016). Make entities.doc_id nullable so a table created
-- on an ERD canvas can be persisted without a docs(id) foreign key.
--
-- Runs without a transaction so `PRAGMA foreign_keys = OFF` actually takes
-- effect: otherwise dropping `entities` would cascade-delete every entity_field
-- and entity_relation row that references it.
PRAGMA foreign_keys = OFF;

CREATE TABLE entities_new (
    id         TEXT PRIMARY KEY,
    doc_id     TEXT REFERENCES docs(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    desc       TEXT NOT NULL DEFAULT '',
    doc_erd_id TEXT REFERENCES doc_erds(id) ON DELETE SET NULL
);

INSERT INTO entities_new (id, doc_id, name, desc, doc_erd_id)
SELECT id, doc_id, name, desc, doc_erd_id FROM entities;

DROP TABLE entities;
ALTER TABLE entities_new RENAME TO entities;

PRAGMA foreign_key_check;
PRAGMA foreign_keys = ON;
