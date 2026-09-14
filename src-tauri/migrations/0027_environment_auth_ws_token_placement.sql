-- WebSocket handshakes need their own placement: many servers can only read a
-- query parameter, while `token_placement` stays about plain HTTP requests.
-- 'query' is the default so existing sockets keep the `?token=` behaviour.
ALTER TABLE environment_auth
    ADD COLUMN ws_token_placement TEXT NOT NULL DEFAULT 'query' CHECK (ws_token_placement IN ('query', 'header', 'cookie'));
