-- Rename the "service" entity to "domain" (DDD wording) across the schema.
--
-- Data-preserving: every statement is a rename, so no row is copied, dropped or
-- rewritten. SQLite (>= 3.25, legacy_alter_table off) rewrites the REFERENCES
-- clauses of dependent tables when the parent table is renamed, so the FKs in
-- docs, doc_erds and doc_websockets follow `services` -> `domains` on their own.
--
-- The vault directory `platforms/<platform_id>/services/<domain_id>` is renamed
-- separately, on the filesystem — see `service::vault::provision::migrate_vault_layout`.
ALTER TABLE services RENAME TO domains;

ALTER TABLE docs RENAME COLUMN service_id TO domain_id;
ALTER TABLE doc_erds RENAME COLUMN service_id TO domain_id;
ALTER TABLE doc_websockets RENAME COLUMN service_id TO domain_id;
