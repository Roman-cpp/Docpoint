use crate::domain::doc_erd::repository::{DocErdRepo, DocErdRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_erd(
    state: State<'_, AppState>,
    erd_id: String,
) -> Result<(), String> {
    DocErdRepo::new(&state.db).delete(&erd_id).await
}
