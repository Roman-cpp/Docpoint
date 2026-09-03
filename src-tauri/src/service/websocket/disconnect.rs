use tauri::State;

use crate::infrastructure::ws_client;
use crate::state::AppState;

/// Closes and forgets the connection identified by `id`. Idempotent: closing an
/// unknown or already-closed connection is a no-op.
#[tauri::command]
pub async fn ws_disconnect(state: State<'_, AppState>, id: String) -> Result<(), String> {
    crate::logging::logged("ws_disconnect", async {
        if let Some((_, conn)) = state.ws_conns.remove(&id) {
            ws_client::close(conn);
        }
        Ok(())
    }
    .await)
}
