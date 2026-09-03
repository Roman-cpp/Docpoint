-- Прокси окружения: через него уходят все HTTP-запросы, отправленные при
-- выбранном окружении, — и запросы пользователя, и запрос авторизации.
--
-- Таблица отдельная, как у `environment_auth`, а не колонки в `environments`:
-- список окружений уезжает на фронт и оседает в localStorage, а пароль прокси
-- там делать нечего. Настройки читаются отдельной командой, по одному
-- окружению за раз.
CREATE TABLE IF NOT EXISTS environment_proxy (
    id             TEXT PRIMARY KEY,
    environment_id TEXT NOT NULL UNIQUE REFERENCES environments(id) ON DELETE CASCADE,
    enabled        INTEGER NOT NULL DEFAULT 0,
    -- `http://host:port`, `https://…` или `socks5://…`; без схемы считается http.
    url            TEXT NOT NULL DEFAULT '',
    username       TEXT NOT NULL DEFAULT '',
    -- Пароль лежит открытым текстом — ровно как тело запроса авторизации в
    -- `environment_auth.body` по соседству.
    password       TEXT NOT NULL DEFAULT '',
    -- Хосты в обход прокси, через запятую: `localhost,127.0.0.1,*.internal`.
    bypass         TEXT NOT NULL DEFAULT '',
    -- Не проверять TLS-сертификат: отладочные прокси (Charles, Proxyman,
    -- mitmproxy) подписывают трафик своим корневым сертификатом, и без этого
    -- каждый https-запрос через них падает на рукопожатии.
    insecure       INTEGER NOT NULL DEFAULT 0
);
