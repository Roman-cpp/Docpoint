ALTER TABLE environment_auth
    ADD COLUMN token_placement TEXT NOT NULL DEFAULT 'header' CHECK (token_placement IN ('header', 'cookie'));

ALTER TABLE environment_auth
    ADD COLUMN cookie_name TEXT NOT NULL DEFAULT 'token';
