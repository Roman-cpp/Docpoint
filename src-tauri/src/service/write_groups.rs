use crate::domain::group::model::CreateGroupDTO;
use crate::domain::group::repository::{GroupRepo, GroupRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn write_groups(
    state: State<'_, AppState>,
    doc_id: String,
    groups: Vec<CreateGroupDTO>,
) -> Result<(), String> {
    GroupRepo::new(&state.db).create(&doc_id, &groups).await
}
