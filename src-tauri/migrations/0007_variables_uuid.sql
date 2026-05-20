CREATE TABLE variables_new (
    id              TEXT PRIMARY KEY,
    environments_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key             TEXT NOT NULL,
    value           TEXT NOT NULL DEFAULT ''
);

INSERT INTO variables_new (id, environments_id, key, value)
SELECT CAST(id AS TEXT), environments_id, key, value FROM variables;

DROP TABLE variables;

ALTER TABLE variables_new RENAME TO variables;
