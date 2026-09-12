use sqlx::{Row, SqlitePool};
use uuid::Uuid;

use super::dto::{EnvironmentProxyDTO, UpdateEnvironmentProxyDTO};

pub async fn ensure_row(
    db: &SqlitePool,
    environment_id: &str,
) -> Result<EnvironmentProxyDTO, String> {
    if let Some(existing) = read_by_env_id(db, environment_id).await? {
        return Ok(existing);
    }
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO environment_proxy (id, environment_id) VALUES (?, ?)")
        .bind(&id)
        .bind(environment_id)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(EnvironmentProxyDTO {
        id,
        environment_id: environment_id.to_string(),
        enabled: false,
        url: String::new(),
        username: String::new(),
        password: String::new(),
        bypass: String::new(),
        insecure: false,
        timeout_ms: 0,
    })
}

pub async fn read_by_env_id(
    db: &SqlitePool,
    environment_id: &str,
) -> Result<Option<EnvironmentProxyDTO>, String> {
    let row = sqlx::query("SELECT * FROM environment_proxy WHERE environment_id = ?")
        .bind(environment_id)
        .fetch_optional(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(row.map(|r| EnvironmentProxyDTO {
        id: r.get("id"),
        environment_id: r.get("environment_id"),
        enabled: r.get::<i64, _>("enabled") != 0,
        url: r.get("url"),
        username: r.get("username"),
        password: r.get("password"),
        bypass: r.get("bypass"),
        insecure: r.get::<i64, _>("insecure") != 0,
        timeout_ms: r.get::<i64, _>("timeout_ms") as u64,
    }))
}

pub async fn upsert(db: &SqlitePool, dto: &UpdateEnvironmentProxyDTO) -> Result<(), String> {
    ensure_row(db, &dto.environment_id).await?;
    sqlx::query(
        "UPDATE environment_proxy SET enabled = ?, url = ?, username = ?, password = ?, bypass = ?, insecure = ?, timeout_ms = ? WHERE environment_id = ?",
    )
    .bind(dto.enabled as i64)
    .bind(&dto.url)
    .bind(&dto.username)
    .bind(&dto.password)
    .bind(&dto.bypass)
    .bind(dto.insecure as i64)
    .bind(dto.timeout_ms as i64)
    .bind(&dto.environment_id)
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
