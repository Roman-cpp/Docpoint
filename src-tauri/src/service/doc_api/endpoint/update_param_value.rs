use crate::state::AppState;

pub async fn update_param_value(
    state: &AppState,
    endpoint_id: String,
    kind: String,
    name: String,
    value: String,
) -> Result<(), String> {
    sqlx::query("UPDATE param SET value = ? WHERE endpoint_id = ? AND kind = ? AND name = ?")
        .bind(&value)
        .bind(&endpoint_id)
        .bind(&kind)
        .bind(&name)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
