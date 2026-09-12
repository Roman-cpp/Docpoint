-- Тело логин-запроса раньше всегда уходило как JSON. Классический OAuth2
-- password/client_credentials grant шлётся как
-- application/x-www-form-urlencoded — нужен выбор.
ALTER TABLE environment_auth
    ADD COLUMN body_content_type TEXT NOT NULL DEFAULT 'json' CHECK (body_content_type IN ('json', 'form'));

-- Доп. статические заголовки логин-запроса (например Basic-заголовок
-- client_id/client_secret или версия API). Тот же формат хранения, что у
-- `auth_cookies`: JSON-объект `{"имя": "значение"}`.
ALTER TABLE environment_auth
    ADD COLUMN extra_headers TEXT NOT NULL DEFAULT '{}';
