use super::dto::{EnvironmentAuthDTO, UpdateEnvironmentAuthDTO};
use sqlx::{Row, SqlitePool};
use std::collections::BTreeMap;
use uuid::Uuid;

/// Куки/заголовки лежат в колонке одним JSON-объектом. Битое значение — пустой
/// набор: он восстановим (повторной авторизацией или правкой настроек), ронять
/// из-за него чтение незачем.
fn parse_json_map(raw: String) -> BTreeMap<String, String> {
    serde_json::from_str(&raw).unwrap_or_default()
}

pub async fn ensure_row(
    db: &SqlitePool,
    environment_id: &str,
) -> Result<EnvironmentAuthDTO, String> {
    if let Some(existing) = read_by_env_id(db, environment_id).await? {
        return Ok(existing);
    }
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO environment_auth (id, environment_id) VALUES (?, ?)")
        .bind(&id)
        .bind(environment_id)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(EnvironmentAuthDTO {
        id,
        environment_id: environment_id.to_string(),
        auth_type: "token".to_string(),
        basic_username: String::new(),
        basic_password: String::new(),
        token_source: "login".to_string(),
        credential_name: "Authorization".to_string(),
        scheme: "Bearer".to_string(),
        url: String::new(),
        method: "POST".to_string(),
        body: String::new(),
        body_content_type: "json".to_string(),
        extra_headers: BTreeMap::new(),
        token_path: String::new(),
        token_placement: "header".to_string(),
        ws_token_placement: "query".to_string(),
        access_token: None,
        auth_cookies: BTreeMap::new(),
        auth_cookie_host: String::new(),
    })
}

pub async fn read_by_env_id(
    db: &SqlitePool,
    environment_id: &str,
) -> Result<Option<EnvironmentAuthDTO>, String> {
    let row = sqlx::query("SELECT * FROM environment_auth WHERE environment_id = ?")
        .bind(environment_id)
        .fetch_optional(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(row.map(|r| EnvironmentAuthDTO {
        id: r.get("id"),
        environment_id: r.get("environment_id"),
        auth_type: r.get("auth_type"),
        basic_username: r.get("basic_username"),
        basic_password: r.get("basic_password"),
        token_source: r.get("token_source"),
        credential_name: r.get("credential_name"),
        scheme: r.get("scheme"),
        url: r.get("url"),
        method: r.get("method"),
        body: r.get("body"),
        body_content_type: r.get("body_content_type"),
        extra_headers: parse_json_map(r.get("extra_headers")),
        token_path: r.get("token_path"),
        token_placement: r.get("token_placement"),
        ws_token_placement: r.get("ws_token_placement"),
        access_token: r.get("access_token"),
        auth_cookies: parse_json_map(r.get("auth_cookies")),
        auth_cookie_host: r.get("auth_cookie_host"),
    }))
}

pub async fn upsert(db: &SqlitePool, dto: &UpdateEnvironmentAuthDTO) -> Result<(), String> {
    ensure_row(db, &dto.environment_id).await?;
    let extra_headers =
        serde_json::to_string(&dto.extra_headers).unwrap_or_else(|_| "{}".to_string());
    sqlx::query(
        "UPDATE environment_auth SET auth_type = ?, basic_username = ?, basic_password = ?, \
         token_source = ?, credential_name = ?, scheme = ?, url = ?, method = ?, body = ?, \
         body_content_type = ?, extra_headers = ?, token_path = ?, token_placement = ?, \
         ws_token_placement = ? WHERE environment_id = ?",
    )
    .bind(&dto.auth_type)
    .bind(&dto.basic_username)
    .bind(&dto.basic_password)
    .bind(&dto.token_source)
    .bind(&dto.credential_name)
    .bind(&dto.scheme)
    .bind(&dto.url)
    .bind(&dto.method)
    .bind(&dto.body)
    .bind(&dto.body_content_type)
    .bind(extra_headers)
    .bind(&dto.token_path)
    .bind(&dto.token_placement)
    .bind(&dto.ws_token_placement)
    .bind(&dto.environment_id)
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn set_access_token(
    db: &SqlitePool,
    environment_id: &str,
    token: Option<&str>,
) -> Result<(), String> {
    ensure_row(db, environment_id).await?;
    sqlx::query("UPDATE environment_auth SET access_token = ? WHERE environment_id = ?")
        .bind(token)
        .bind(environment_id)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Сохраняет куки сессии и хост, который их выдал. Вызывается только
/// авторизацией — руками эти значения не редактируются.
pub async fn set_auth_cookies(
    db: &SqlitePool,
    environment_id: &str,
    cookies: &BTreeMap<String, String>,
    host: &str,
) -> Result<(), String> {
    ensure_row(db, environment_id).await?;
    let json = serde_json::to_string(cookies).unwrap_or_else(|_| "{}".to_string());
    sqlx::query(
        "UPDATE environment_auth SET auth_cookies = ?, auth_cookie_host = ? WHERE environment_id = ?",
    )
    .bind(json)
    .bind(host)
    .bind(environment_id)
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
