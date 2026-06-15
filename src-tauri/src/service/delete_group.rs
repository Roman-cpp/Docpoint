use crate::domain::group::repository::{GroupRepo, GroupRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_group(
    state: State<'_, AppState>,
    group_id: String,
) -> Result<(), String> {
    GroupRepo::new(&state.db).delete(&group_id).await
}
