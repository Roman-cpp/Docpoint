use crate::domain::group::model::Group;
use crate::domain::group::repository::{GroupRepo, GroupRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_groups(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<Group>, String> {
    GroupRepo::new(&state.db).all(&doc_id).await
}
