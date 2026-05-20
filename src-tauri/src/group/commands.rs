use crate::state::AppState;
use super::model::{CreateGroup, Group};
use super::repository::{GroupRepo, GroupRepository};
use tauri::State;

#[tauri::command]
pub async fn read_groups(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<Group>, String> {
    GroupRepo::new(&state.db).all(&doc_id).await
}

#[tauri::command]
pub async fn write_groups(
    state: State<'_, AppState>,
    doc_id: String,
    groups: Vec<CreateGroup>,
) -> Result<(), String> {
    GroupRepo::new(&state.db).create(&doc_id, &groups).await
}
