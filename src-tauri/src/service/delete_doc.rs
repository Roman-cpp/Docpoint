use crate::domain::doc::repository::{DocRepo, DocRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_doc(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    DocRepo::new(&state.db).delete(&id).await
}
