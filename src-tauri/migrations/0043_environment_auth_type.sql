-- Тип авторизации окружения: раньше подразумевался единственный сценарий —
-- логин-запрос, отдающий bearer-токен или куки. Многим REST API это не
-- подходит: Basic Auth и статичный API-ключ шлются на каждый запрос без
-- какого-либо логина. `token_source` решает, берётся ли значение токена через
-- логин-запрос (как раньше) или задаётся вручную (пишется прямо в
-- `access_token`, как это уже делает ручная авторизация).
ALTER TABLE environment_auth
    ADD COLUMN auth_type TEXT NOT NULL DEFAULT 'token' CHECK (auth_type IN ('none', 'basic', 'token'));

ALTER TABLE environment_auth
    ADD COLUMN basic_username TEXT NOT NULL DEFAULT '';

ALTER TABLE environment_auth
    ADD COLUMN basic_password TEXT NOT NULL DEFAULT '';

ALTER TABLE environment_auth
    ADD COLUMN token_source TEXT NOT NULL DEFAULT 'login' CHECK (token_source IN ('static', 'login'));

-- Имя заголовка/query-параметра/куки, куда кладётся токен — раньше было
-- захардкожено как `Authorization`.
ALTER TABLE environment_auth
    ADD COLUMN credential_name TEXT NOT NULL DEFAULT 'Authorization';

-- Префикс значения при подстановке в заголовок (`Bearer`, `Token`, пусто…) —
-- раньше был захардкожен как `Bearer `.
ALTER TABLE environment_auth
    ADD COLUMN scheme TEXT NOT NULL DEFAULT 'Bearer';
