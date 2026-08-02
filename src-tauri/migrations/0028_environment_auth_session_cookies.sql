-- Куки сессии принадлежат окружению: их присылает сервер авторизации в
-- `Set-Cookie`, и дальше они уходят и в HTTP-запросы, и в WebSocket-рукопожатие
-- этого окружения. Хранится JSON-объект `{"имя": "значение"}`.
ALTER TABLE environment_auth
    ADD COLUMN auth_cookies TEXT NOT NULL DEFAULT '{}';

-- Хост, выдавший куки (из URL запроса авторизации). Куки уходят только на него
-- и его поддомены, иначе сессия утекла бы на сторонний домен, если в окружении
-- авторизация и API живут на разных хостах.
ALTER TABLE environment_auth
    ADD COLUMN auth_cookie_host TEXT NOT NULL DEFAULT '';

-- Режим «положить токен в куку с заданным именем» заменён на куки сессии: имя и
-- значение теперь всегда приходят от сервера, задавать их вручную незачем.
ALTER TABLE environment_auth
    DROP COLUMN cookie_name;
