use crate::domain::environment::environment::entity::Environment;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_environments_by_doc(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<Environment>, String> {
    crate::logging::logged(
        "read_environments_by_doc",
        crate::service::read_environments_by_doc(&state, doc_id).await,
    )
}
