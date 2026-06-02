use crate::domain::doc::model::Doca;
use crate::domain::platform::repository::{PlatformRepo, PlatformRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_platform_docs(
    state: State<'_, AppState>,
    platform_id: String,
) -> Result<Vec<Doca>, String> {
    PlatformRepo::new(&state.db).docs_by_platform(&platform_id).await
}
