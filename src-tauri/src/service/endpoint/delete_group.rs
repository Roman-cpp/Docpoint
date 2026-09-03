use crate::domain::doc_api::group::repository::GroupRepository;
use crate::repository::sqlite::group::GroupRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_group(state: State<'_, AppState>, group_id: String) -> Result<(), String> {
    crate::logging::logged(
        "delete_group",
        async { GroupRepo::new(&state.db).delete(&group_id).await }.await,
    )
}
