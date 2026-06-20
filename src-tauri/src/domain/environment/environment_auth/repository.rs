use super::dto::{EnvironmentAuthDTO, UpdateEnvironmentAuthDTO};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub async fn ensure_row(db: &SqlitePool, environment_id: &str) -> Result<EnvironmentAuthDTO, String> {
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
        url: String::new(),
        method: "POST".to_string(),
        body: String::new(),
        token_path: String::new(),
        access_token: None,
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
        url: r.get("url"),
        method: r.get("method"),
        body: r.get("body"),
        token_path: r.get("token_path"),
        access_token: r.get("access_token"),
    }))
}

pub async fn get_access_token(
    db: &SqlitePool,
    environment_id: &str,
) -> Result<Option<String>, String> {
    let row = sqlx::query("SELECT access_token FROM environment_auth WHERE environment_id = ?")
        .bind(environment_id)
        .fetch_optional(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(row.and_then(|r| r.get("access_token")))
}

pub async fn upsert(db: &SqlitePool, dto: &UpdateEnvironmentAuthDTO) -> Result<(), String> {
    ensure_row(db, &dto.environment_id).await?;
    sqlx::query(
        "UPDATE environment_auth SET url = ?, method = ?, body = ?, token_path = ? WHERE environment_id = ?",
    )
    .bind(&dto.url)
    .bind(&dto.method)
    .bind(&dto.body)
    .bind(&dto.token_path)
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
