-- no-transaction
-- Replace the polymorphic environmentable_id/environmentable_type pair (migration
-- 0010) with a direct platform_id FK to platforms.
--
--   * platform environments keep their owner as-is;
--   * doc environments are remapped to the doc's platform (docs.platform_id,
--     migration 0011);
--   * environments whose owner has no platform are dropped, together with their
--     variables and environment_auth rows.
--
-- Runs without a transaction so `PRAGMA foreign_keys = OFF` actually takes effect:
-- otherwise the DROP TABLE below would cascade-delete every row in `variables`
-- and `environment_auth`.
PRAGMA foreign_keys = OFF;

-- Resolve each environment's target platform_id once.
CREATE TEMP TABLE _env_platform AS
SELECT e.id AS env_id,
       CASE
           WHEN e.environmentable_type = 'platform' THEN e.environmentable_id
           ELSE (SELECT d.platform_id FROM docs d WHERE d.id = e.environmentable_id)
       END AS platform_id
FROM environments e;

-- Remove variables/auth belonging to environments that won't survive (no platform).
DELETE FROM variables
WHERE environments_id IN (SELECT env_id FROM _env_platform WHERE platform_id IS NULL);
DELETE FROM environment_auth
WHERE environment_id IN (SELECT env_id FROM _env_platform WHERE platform_id IS NULL);

CREATE TABLE environments_new (
    id          TEXT PRIMARY KEY,
    platform_id TEXT REFERENCES platforms(id) ON DELETE CASCADE,
    env         TEXT NOT NULL,
    label       TEXT NOT NULL,
    dot         TEXT NOT NULL DEFAULT '',
    base_url    TEXT NOT NULL,
    prefix      TEXT NOT NULL DEFAULT ''
);

INSERT INTO environments_new (id, platform_id, env, label, dot, base_url, prefix)
SELECT e.id, p.platform_id, e.env, e.label, e.dot, e.base_url, e.prefix
FROM environments e
JOIN _env_platform p ON p.env_id = e.id
WHERE p.platform_id IS NOT NULL;

DROP TABLE environments;
ALTER TABLE environments_new RENAME TO environments;
DROP TABLE _env_platform;

CREATE INDEX idx_environments_platform ON environments (platform_id);

PRAGMA foreign_key_check;
PRAGMA foreign_keys = ON;
