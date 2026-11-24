use crate::state::AppState;

/// Запоминает за параметром переменную окружения, выбранную в «Try it».
///
/// Значение — не часть описания параметра, поэтому оно и правится отдельной
/// командой: панель запоминает выбор пользователя, не пересылая весь эндпоинт
/// и не трогая его документацию. У полей тела такого канала нет — ссылка на
/// переменную пишется прямо в документ тела.
pub async fn update_param_value(
    state: &AppState,
    endpoint_id: String,
    kind: String,
    name: String,
    value: String,
) -> Result<(), String> {
    if !matches!(kind.as_str(), "path" | "query" | "header" | "cookie") {
        return Err(format!("неизвестный вид параметра: {kind:?}"));
    }

    sqlx::query(
        "UPDATE endpoint_param SET value = ? \
         WHERE endpoint_id = ? AND kind = ? AND name = ?",
    )
    .bind(&value)
    .bind(&endpoint_id)
    .bind(&kind)
    .bind(&name)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}
