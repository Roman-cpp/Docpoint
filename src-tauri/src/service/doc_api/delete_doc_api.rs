use crate::domain::doc_api::doc_api::repository::DocRepository;
use crate::domain::doc_api::doc_content::repository::DocContentRepository;
use crate::repository::filesystem::doc_content::DocContentRepo;
use crate::repository::sqlite::doc_api::DocRepo;
use crate::state::AppState;
use tauri::State;

/// Delete a doc together with its markdown body, so no orphaned file is left
/// behind in the doc store.
#[tauri::command]
pub async fn delete_doc(state: State<'_, AppState>, id: String) -> Result<(), String> {
    DocRepo::new(&state.db).delete(&id).await?;
    DocContentRepo::new(&state.docs_dir).delete(&id).await
}
