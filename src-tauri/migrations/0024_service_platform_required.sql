-- no-transaction
-- A service now owns a directory under its platform
-- (vault/platforms/<platform_id>/services/<service_id>), so a service without a
-- platform has nowhere to live. Make the link mandatory.
--
-- SQLite cannot ALTER a column to NOT NULL, so the table is rebuilt. Foreign
-- keys are switched off for the swap: with them on, DROP TABLE services would
-- fire the ON DELETE actions of docs, doc_erds and doc_websockets and take
-- unrelated rows with it. The pragma only works outside a transaction, hence
-- `-- no-transaction` above.
PRAGMA foreign_keys = OFF;

CREATE TABLE services_new (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    desc        TEXT NOT NULL DEFAULT '',
    platform_id TEXT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE
);

-- Services that never got a platform cannot be represented in the new tree.
INSERT INTO services_new (id, name, desc, platform_id)
SELECT id, name, desc, platform_id FROM services WHERE platform_id IS NOT NULL;

DROP TABLE services;
ALTER TABLE services_new RENAME TO services;

-- Rows that pointed at a dropped service are detached rather than deleted:
-- their content survives, it just needs re-attaching to a service.
UPDATE docs SET service_id = NULL
WHERE service_id IS NOT NULL
  AND service_id NOT IN (SELECT id FROM services);

UPDATE doc_erds SET service_id = NULL
WHERE service_id IS NOT NULL
  AND service_id NOT IN (SELECT id FROM services);

UPDATE doc_websockets SET service_id = NULL
WHERE service_id IS NOT NULL
  AND service_id NOT IN (SELECT id FROM services);

PRAGMA foreign_keys = ON;
