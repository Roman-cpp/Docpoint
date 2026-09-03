use crate::domain::doc_api::doc_api::entity::DocApi;
use crate::domain::doc_api::doc_api::repository::DocApiRepository;
use crate::repository::sqlite::doc_api::DocApiRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_doc(state: State<'_, AppState>, id: String) -> Result<Option<DocApi>, String> {
    crate::logging::logged(
        "read_doc",
        async { DocApiRepo::new(&state.db).find(&id).await }.await,
    )
}
