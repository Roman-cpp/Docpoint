use super::model::Environment;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub async fn read_configs(db: &SqlitePool, doc_id: &str) -> Result<Vec<Environment>, String> {
    let rows = sqlx::query("SELECT * FROM environments WHERE doc_id = ?")
        .bind(doc_id)
        .fetch_all(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows
        .iter()
        .map(|r| Environment {
            id: r.get("id"),
            env: r.get("env"),
            label: r.get("label"),
            base_url: r.get("base_url"),
            value: vec![],
        })
        .collect())
}

pub async fn write_configs(
    db: &SqlitePool,
    doc_id: &str,
    configs: &[Environment],
) -> Result<(), String> {
    for config in configs {
        sqlx::query(
            "INSERT INTO environments (id, doc_id, env, label, base_url) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(Uuid::new_v4().to_string())
        .bind(doc_id)
        .bind(&config.env)
        .bind(&config.label)
        .bind(&config.base_url)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
