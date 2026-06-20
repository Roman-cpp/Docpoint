use crate::domain::doc_api::doc_api::repository::DocRepository;
use crate::repository::sqlite::doc_api::DocRepo;
use crate::domain::environment::environment::entity::Environment;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_environments_by_doc(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<Environment>, String> {
    DocRepo::new(&state.db)
        .environments_by_doc(&doc_id)
        .await
}
