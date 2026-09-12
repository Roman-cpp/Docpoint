use std::collections::HashMap;

use tauri::{AppHandle, State};

use crate::state::AppState;

#[tauri::command]
pub async fn ws_connect(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    headers: Option<HashMap<String, String>>,
    id: Option<String>,
) -> Result<String, String> {
    crate::logging::logged(
        "ws_connect",
        crate::service::ws_connect(app, &state, url, headers, id).await,
    )
}
