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
}

#[derive(Serialize)]
pub struct ResponsePayload {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub duration_ms: u64,
}

pub async fn send(payload: RequestPayload) -> Result<ResponsePayload, String> {
    let client = reqwest::Client::new();

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

    let body = response.text().await.map_err(|e| e.to_string())?;

    Ok(ResponsePayload {
        status: status.as_u16(),
        status_text,
        headers: resp_headers,
        body,
        duration_ms,
    })
}
