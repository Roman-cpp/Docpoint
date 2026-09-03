use dashmap::DashMap;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;

use crate::domain::environment::environment_proxy::entity::ProxyConfig;

#[derive(Deserialize, Clone)]
pub struct RequestPayload {
    method: String,
    url: String,
    pub headers: HashMap<String, String>,
    body: Option<String>,
}

impl RequestPayload {
    pub fn new(
        method: String,
        url: String,
        headers: HashMap<String, String>,
        body: Option<String>,
    ) -> Self {
        Self {
            method,
            url,
            headers,
            body,
        }
    }

    /// Адрес запроса — нужен, чтобы решить, можно ли слать сюда куки окружения.
    pub fn url(&self) -> &str {
        &self.url
    }
}

#[derive(Serialize)]
pub struct ResponsePayload {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    /// Все заголовки `Set-Cookie` ответа, по одному на элемент: в `headers` они
    /// не помещаются, там одноимённые схлопываются в последний.
    pub set_cookies: Vec<String>,
    pub body: String,
    pub duration_ms: u64,
}

/// Builds the app-wide HTTP client.
///
/// Свой cookie jar у reqwest выключен намеренно: он один на всё приложение, а
/// куки у нас принадлежат окружению. Общий jar подхватывал бы `Set-Cookie` из
/// любого ответа и переживал переключение окружения. Вместо него куки сессии
/// хранятся per-env в БД и подставляются явно — см.
/// [`cookies`](crate::service::env_auth::cookies).
pub fn build_client() -> reqwest::Client {
    reqwest::Client::builder()
        .cookie_store(false)
        .build()
        .expect("failed to build reqwest client")
}

/// Схемы, которые reqwest действительно умеет проксировать.
const PROXY_SCHEMES: [&str; 4] = ["http", "https", "socks5", "socks5h"];

/// Отсекает адрес со схемой, которой прокси-клиент не знает.
///
/// Проверка нужна своя: `Proxy::all` такой адрес принимает, а на запросе
/// молча ходит напрямую — то есть трафик уходит мимо прокси, и по ответу это
/// никак не видно. Адрес без схемы законен, reqwest считает его http.
fn check_scheme(url: &str) -> Result<(), String> {
    let Some((scheme, _)) = url.split_once("://") else {
        return Ok(());
    };
    if PROXY_SCHEMES.contains(&scheme.to_ascii_lowercase().as_str()) {
        return Ok(());
    }
    Err(format!(
        "Прокси '{url}': схема {scheme} не поддерживается, нужна одна из {}",
        PROXY_SCHEMES.join(", ")
    ))
}

/// Тот же клиент, но с прокси окружения.
///
/// Возвращает ошибку сразу, а не молча ходит напрямую: прокси задают, когда без
/// него до сервера не достучаться, и «не смогли — пошли мимо» здесь хуже
/// внятного отказа.
fn build_proxy_client(proxy: &ProxyConfig) -> Result<reqwest::Client, String> {
    check_scheme(&proxy.url)?;

    let mut scheme = reqwest::Proxy::all(&proxy.url)
        .map_err(|e| format!("Некорректный адрес прокси '{}': {e}", proxy.url))?;

    if !proxy.username.is_empty() || !proxy.password.is_empty() {
        scheme = scheme.basic_auth(&proxy.username, &proxy.password);
    }
    if !proxy.bypass.is_empty() {
        scheme = scheme.no_proxy(reqwest::NoProxy::from_string(&proxy.bypass));
    }

    reqwest::Client::builder()
        .cookie_store(false)
        .proxy(scheme)
        .danger_accept_invalid_certs(proxy.insecure)
        .build()
        .map_err(|e| format!("Не удалось собрать клиент с прокси: {e}"))
}

/// Клиенты приложения: один прямой и по одному на каждую настройку прокси.
///
/// Прокси в reqwest задаётся на клиенте, а не на запросе, поэтому одним общим
/// клиентом переключаться между окружениями нельзя. Клиенты кэшируются:
/// сборка тянет за собой новый пул соединений и свой TLS-конфиг, а окружений
/// с прокси на практике единицы.
pub struct ClientPool {
    direct: reqwest::Client,
    by_proxy: DashMap<ProxyConfig, reqwest::Client>,
}

impl ClientPool {
    pub fn new() -> Self {
        Self {
            direct: build_client(),
            by_proxy: DashMap::new(),
        }
    }

    /// Клиент для запроса окружения: `None` — напрямую.
    ///
    /// `reqwest::Client` — обёртка над `Arc`, так что клон здесь дешёвый и
    /// пул соединений у него общий.
    pub fn get(&self, proxy: Option<&ProxyConfig>) -> Result<reqwest::Client, String> {
        let Some(proxy) = proxy else {
            return Ok(self.direct.clone());
        };
        if let Some(client) = self.by_proxy.get(proxy) {
            return Ok(client.clone());
        }

        let client = build_proxy_client(proxy)?;
        self.by_proxy.insert(proxy.clone(), client.clone());
        Ok(client)
    }
}

impl Default for ClientPool {
    fn default() -> Self {
        Self::new()
    }
}

/// Заголовки, значения которых в лог не попадают: в них токены, сессии и
/// пароли прокси. Сравнение без учёта регистра — заголовки его не различают.
const SECRET_HEADERS: [&str; 5] = [
    "authorization",
    "proxy-authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
];

/// Заголовки для записи в лог: секретные заменены звёздочками, остальные как
/// есть. Единственное место маскирования — чтобы правило не расходилось.
pub fn masked_headers<'a, I>(headers: I) -> Vec<(String, String)>
where
    I: IntoIterator<Item = (&'a String, &'a String)>,
{
    headers
        .into_iter()
        .map(|(name, value)| {
            let hidden = SECRET_HEADERS.contains(&name.to_ascii_lowercase().as_str());
            (name.clone(), if hidden { "***".to_string() } else { value.clone() })
        })
        .collect()
}

/// Адрес без строки запроса: в ней часто лежат ключи API и подписи.
fn url_for_log(url: &str) -> &str {
    url.split(['?', '#']).next().unwrap_or(url)
}

pub async fn send(client: &reqwest::Client, payload: RequestPayload) -> Result<ResponsePayload, String> {
    log::debug!(
        target: "http",
        "{} {} headers={:?}",
        payload.method,
        url_for_log(&payload.url),
        masked_headers(&payload.headers)
    );

    let mut header_map = HeaderMap::new();
    for (key, value) in &payload.headers {
        if key.is_empty() {
            continue;
        }
        let name = HeaderName::from_str(key).map_err(|e| format!("Invalid header name '{key}': {e}"))?;
        let val = HeaderValue::from_str(value).map_err(|e| format!("Invalid header value for '{key}': {e}"))?;
        header_map.insert(name, val);
    }

    let method = payload.method.to_uppercase();
    let request = match method.as_str() {
        "GET"     => client.get(&payload.url),
        "POST"    => client.post(&payload.url),
        "PUT"     => client.put(&payload.url),
        "DELETE"  => client.delete(&payload.url),
        "PATCH"   => client.patch(&payload.url),
        "HEAD"    => client.head(&payload.url),
        "OPTIONS" => client.request(reqwest::Method::OPTIONS, &payload.url),
        _ => return Err(format!("Unsupported method: {method}")),
    };

    let request = request.headers(header_map);
    let request = if let Some(body) = payload.body {
        if body.is_empty() { request } else { request.body(body) }
    } else {
        request
    };

    let start = std::time::Instant::now();
    let response = request.send().await.map_err(|e| {
        log::warn!(target: "http", "{} {}: {e}", method, url_for_log(&payload.url));
        e.to_string()
    })?;
    let duration_ms = start.elapsed().as_millis() as u64;

    let status = response.status();
    log::info!(
        target: "http",
        "{} {} -> {} за {duration_ms} мс",
        method,
        url_for_log(&payload.url),
        status.as_u16()
    );
    let status_text = status.canonical_reason().unwrap_or("Unknown").to_string();

    let mut resp_headers = HashMap::new();
    for (name, value) in response.headers() {
        resp_headers.insert(name.to_string(), value.to_str().unwrap_or("").to_string());
    }
    let set_cookies = response
        .headers()
        .get_all(reqwest::header::SET_COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok().map(str::to_string))
        .collect();

    let body = response.text().await.map_err(|e| e.to_string())?;

    Ok(ResponsePayload {
        status: status.as_u16(),
        status_text,
        headers: resp_headers,
        set_cookies,
        body,
        duration_ms,
    })
}

#[cfg(test)]
mod tests {
    /// Токены и куки в лог не попадают, регистр имени заголовка не важен.
    #[test]
    fn secret_headers_are_masked_in_logs() {
        let headers = std::collections::HashMap::from([
            ("Authorization".to_string(), "Bearer secret".to_string()),
            ("COOKIE".to_string(), "sid=1".to_string()),
            ("Accept".to_string(), "application/json".to_string()),
        ]);
        let mut masked = super::masked_headers(&headers);
        masked.sort();
        assert_eq!(
            masked,
            [
                ("Accept".to_string(), "application/json".to_string()),
                ("Authorization".to_string(), "***".to_string()),
                ("COOKIE".to_string(), "***".to_string()),
            ]
        );
        assert_eq!(super::url_for_log("https://a.b/c?key=1#x"), "https://a.b/c");
    }

    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    /// Крошечный сервер: отвечает двумя `Set-Cookie` и возвращает заголовки
    /// каждого полученного запроса.
    async fn spawn_server() -> (String, tokio::sync::mpsc::UnboundedReceiver<String>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::mpsc::unbounded_channel();

        tokio::spawn(async move {
            loop {
                let Ok((mut socket, _)) = listener.accept().await else {
                    return;
                };
                let tx = tx.clone();
                tokio::spawn(async move {
                    let mut buf = vec![0u8; 4096];
                    let n = socket.read(&mut buf).await.unwrap_or(0);
                    let _ = tx.send(String::from_utf8_lossy(&buf[..n]).to_string());
                    let _ = socket
                        .write_all(
                            b"HTTP/1.1 200 OK\r\n\
                              Set-Cookie: sid=abc; Path=/; HttpOnly\r\n\
                              Set-Cookie: csrf=xyz; Path=/\r\n\
                              Content-Length: 2\r\n\
                              Connection: close\r\n\r\n{}",
                        )
                        .await;
                });
            }
        });

        (format!("http://{addr}"), rx)
    }

    fn get(url: &str) -> RequestPayload {
        RequestPayload::new("GET".to_string(), url.to_string(), HashMap::new(), None)
    }

    #[tokio::test]
    async fn every_set_cookie_survives_the_response() {
        let (url, _rx) = spawn_server().await;
        let response = send(&build_client(), get(&url)).await.unwrap();

        // В `headers` одноимённые схлопываются — именно поэтому нужен отдельный
        // список: без него вторая кука терялась бы молча.
        assert_eq!(response.set_cookies.len(), 2);
        assert!(response.set_cookies[0].starts_with("sid=abc"));
        assert!(response.set_cookies[1].starts_with("csrf=xyz"));
    }

    fn proxy_at(addr: &str) -> ProxyConfig {
        ProxyConfig {
            url: addr.to_string(),
            ..Default::default()
        }
    }

    #[tokio::test]
    async fn request_goes_out_through_the_proxy() {
        let (proxy_url, mut rx) = spawn_server().await;
        let pool = ClientPool::new();
        let client = pool.get(Some(&proxy_at(&proxy_url))).unwrap();

        // Хост заведомо несуществующий: если ответ пришёл, запрос ходил не
        // напрямую, а до прокси, который у нас и отвечает.
        send(&client, get("http://nowhere.invalid/ping")).await.unwrap();

        let seen = rx.recv().await.unwrap();
        assert!(
            seen.starts_with("GET http://nowhere.invalid/ping"),
            "прокси получил не абсолютный запрос: {seen}"
        );
    }

    #[tokio::test]
    async fn a_client_is_built_once_per_proxy() {
        let pool = ClientPool::new();
        let one = proxy_at("http://127.0.0.1:9");
        let two = proxy_at("http://127.0.0.1:10");

        pool.get(Some(&one)).unwrap();
        pool.get(Some(&one)).unwrap();
        pool.get(Some(&two)).unwrap();
        pool.get(None).unwrap();

        // Клиент тянет за собой пул соединений и TLS-конфиг: пересобирать его
        // на каждый запрос — значит каждый раз ходить по новому соединению.
        assert_eq!(pool.by_proxy.len(), 2);
    }

    #[tokio::test]
    async fn a_broken_proxy_address_is_reported_not_bypassed() {
        let pool = ClientPool::new();

        // Адрес, который не разбирается вовсе.
        assert!(pool.get(Some(&proxy_at("not a url"))).is_err());
        // Схему вроде ftp:// reqwest принимает, а потом ходит мимо прокси. Для
        // окружения за периметром это худший исход: запрос ушёл наружу, и по
        // ответу этого не видно, — поэтому отказываем сами.
        assert!(pool.get(Some(&proxy_at("ftp://127.0.0.1:1080"))).is_err());
        // Без схемы — законный http-прокси.
        assert!(pool.get(Some(&proxy_at("127.0.0.1:8888"))).is_ok());
        assert!(pool.get(Some(&proxy_at("socks5://127.0.0.1:1080"))).is_ok());
    }

    #[tokio::test]
    async fn client_does_not_replay_cookies_on_its_own() {
        let (url, mut rx) = spawn_server().await;
        let client = build_client();

        send(&client, get(&url)).await.unwrap();
        let _first = rx.recv().await.unwrap();

        send(&client, get(&url)).await.unwrap();
        let second = rx.recv().await.unwrap();

        // Куки принадлежат окружению и подставляются явно; общий jar reqwest
        // разослал бы их сам, куда бы ни ушёл следующий запрос.
        assert!(
            !second.to_lowercase().contains("cookie:"),
            "клиент подставил куки сам: {second}"
        );
    }
}
