use crate::domain::platform::repository::{PlatformRepo, PlatformRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn attach_doc(
    state: State<'_, AppState>,
    platform_id: String,
    doc_id: String,
) -> Result<(), String> {
    PlatformRepo::new(&state.db)
        .attach_doc(&platform_id, &doc_id)
        .await
}
