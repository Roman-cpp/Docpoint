use std::collections::HashMap;

use tauri::{AppHandle, State};

use crate::infrastructure::ws_client;
use crate::state::AppState;

/// Opens a WebSocket connection to `url` from the backend and streams every
/// incoming frame to the frontend over the event channel `ws://{id}`.
///
/// The caller may supply `id` so it can register its event listener *before*
/// connecting and never miss the initial `Open`/first frames; when omitted a
/// fresh uuid is generated. The returned id is the event-channel suffix and the
/// handle for [`ws_send`](super::ws_send) / [`ws_disconnect`](super::ws_disconnect).
#[tauri::command]
pub async fn ws_connect(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    headers: Option<HashMap<String, String>>,
    id: Option<String>,
) -> Result<String, String> {
    let id = id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let conn = ws_client::connect(app, id.clone(), url, headers).await?;
    state.ws_conns.insert(id.clone(), conn);
    Ok(id)
}
