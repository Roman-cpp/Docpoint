-- no-transaction
-- Polymorphic association for environments (Laravel-style morphTo):
-- environmentable_type + environmentable_id replace doc_id / platform_id.
--
-- Runs without a transaction so `PRAGMA foreign_keys = OFF` actually takes
-- effect: otherwise the DROP TABLE below would cascade-delete every row in
-- `variables` and `environment_auth`.
PRAGMA foreign_keys = OFF;

CREATE TABLE environments_new (
    id                   TEXT PRIMARY KEY,
    environmentable_id   TEXT NOT NULL,
    environmentable_type TEXT NOT NULL CHECK (environmentable_type IN ('doc', 'platform')),
    env                  TEXT NOT NULL,
    label                TEXT NOT NULL,
    dot                  TEXT NOT NULL DEFAULT '',
    base_url             TEXT NOT NULL,
    prefix               TEXT NOT NULL DEFAULT ''
);

INSERT INTO environments_new (id, environmentable_id, environmentable_type, env, label, dot, base_url, prefix)
SELECT id,
       COALESCE(platform_id, doc_id),
       CASE WHEN platform_id IS NOT NULL THEN 'platform' ELSE 'doc' END,
       env, label, dot, base_url, prefix
FROM environments;

DROP TABLE environments;
ALTER TABLE environments_new RENAME TO environments;

CREATE INDEX idx_environments_environmentable
    ON environments (environmentable_type, environmentable_id);

PRAGMA foreign_key_check;
PRAGMA foreign_keys = ON;
