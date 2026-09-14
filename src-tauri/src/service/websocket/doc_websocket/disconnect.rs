use crate::infrastructure::ws_client;
use crate::state::AppState;

/// Closes and forgets the connection identified by `id`. Idempotent: closing an
/// unknown or already-closed connection is a no-op.
pub async fn ws_disconnect(state: &AppState, id: String) -> Result<(), String> {
    if let Some((_, conn)) = state.ws_conns.remove(&id) {
        ws_client::close(conn);
    }
    Ok(())
}
