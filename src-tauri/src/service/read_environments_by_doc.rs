use crate::domain::doc::repository::{DocRepo, DocRepository};
use crate::domain::environment::model::Environment;
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
