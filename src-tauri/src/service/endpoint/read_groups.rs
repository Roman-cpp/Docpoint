use crate::domain::doc_api::group::entity::Group;
use crate::domain::doc_api::group::repository::GroupRepository;
use crate::repository::sqlite::group::GroupRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_groups(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<Group>, String> {
    GroupRepo::new(&state.db).all(&doc_id).await
}
