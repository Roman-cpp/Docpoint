use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_param_value(
    state: State<'_, AppState>,
    endpoint_id: String,
    kind: String,
    name: String,
    value: String,
) -> Result<(), String> {
    crate::logging::logged(
        "update_param_value",
        crate::service::update_param_value(&state, endpoint_id, kind, name, value).await,
    )
}
