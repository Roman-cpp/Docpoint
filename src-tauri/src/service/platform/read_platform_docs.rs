use crate::domain::doc_api::doc_api::entity::DocApi;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_platform_docs(
    state: State<'_, AppState>,
    platform_id: String,
) -> Result<Vec<DocApi>, String> {
    PlatformRepo::new(&state.db).docs_by_platform(&platform_id).await
}
