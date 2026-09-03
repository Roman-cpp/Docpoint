use tauri::State;

use crate::infrastructure::ws_client;
use crate::state::AppState;

/// Sends a text frame over an open connection identified by `id`.
#[tauri::command]
pub async fn ws_send(state: State<'_, AppState>, id: String, text: String) -> Result<(), String> {
    crate::logging::logged(
        "ws_send",
        async {
            let conn = state
                .ws_conns
                .get(&id)
                .ok_or_else(|| format!("no such connection: {id}"))?;
            ws_client::send(&conn, text)
        }
        .await,
    )
}
