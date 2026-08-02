use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;

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

pub async fn send(client: &reqwest::Client, payload: RequestPayload) -> Result<ResponsePayload, String> {
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
    let response = request.send().await.map_err(|e| e.to_string())?;
    let duration_ms = start.elapsed().as_millis() as u64;

    let status = response.status();
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
