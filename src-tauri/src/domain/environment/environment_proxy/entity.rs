/// Прокси в том виде, в каком его спрашивает HTTP-клиент: только то, что влияет
/// на сборку клиента.
///
/// Служит ещё и ключом кэша клиентов ([`ClientPool`]): reqwest задаёт прокси на
/// клиенте, а не на запросе, поэтому на каждую различающуюся настройку нужен
/// свой клиент. Отсюда `Hash` и `Eq`.
///
/// [`ClientPool`]: crate::infrastructure::http_client::ClientPool
#[derive(Debug, Clone, Default, PartialEq, Eq, Hash)]
pub struct ProxyConfig {
    /// `http://host:port`, `https://…` или `socks5://…`. Без схемы — http.
    pub url: String,
    pub username: String,
    pub password: String,
    /// Хосты в обход прокси, через запятую.
    pub bypass: String,
    /// Не проверять TLS-сертификат: отладочные прокси подменяют его своим.
    pub insecure: bool,
}
