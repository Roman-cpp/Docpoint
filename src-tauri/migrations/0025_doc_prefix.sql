-- Prefix of a doc, appended after the environment prefix when a request URL is
-- composed: base_url + environments.prefix + docs.prefix + endpoint path.
ALTER TABLE docs ADD COLUMN prefix TEXT NOT NULL DEFAULT '';
