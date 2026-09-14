use crate::infrastructure::ws_client;
use crate::state::AppState;

/// Sends a text frame over an open connection identified by `id`.
pub async fn ws_send(state: &AppState, id: String, text: String) -> Result<(), String> {
    let conn = state
        .ws_conns
        .get(&id)
        .ok_or_else(|| format!("no such connection: {id}"))?;
    ws_client::send(&conn, text)
}
