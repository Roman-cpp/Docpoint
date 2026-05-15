use crate::state::AppState;
use super::model::EnvConfig;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn db_read_env_configs(
    state: State<'_, AppState>,
    doca_id: String,
) -> Result<Vec<EnvConfig>, String> {
    let rows = sqlx::query("SELECT * FROM env_config WHERE doca_id = ?")
        .bind(&doca_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows
        .iter()
        .map(|r| EnvConfig {
            id: r.get("id"),
            env: r.get("env"),
            label: r.get("label"),
            base_url: r.get("base_url"),
            value: vec![],
        })
        .collect())
}

#[tauri::command]
pub async fn db_write_env_configs(
    state: State<'_, AppState>,
    doca_id: String,
    configs: Vec<EnvConfig>,
) -> Result<(), String> {
    sqlx::query("DELETE FROM env_config WHERE doca_id = ?")
        .bind(&doca_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    for config in &configs {
        sqlx::query(
            "INSERT INTO env_config (id, doca_id, env, label, base_url) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&config.id)
        .bind(&doca_id)
        .bind(&config.env)
        .bind(&config.label)
        .bind(&config.base_url)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
