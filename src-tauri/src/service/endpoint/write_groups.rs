use crate::domain::doc_api::group::dto::CreateGroupDTO;
use crate::domain::doc_api::group::repository::GroupRepository;
use crate::repository::sqlite::group::GroupRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn write_groups(
    state: State<'_, AppState>,
    doc_id: String,
    groups: Vec<CreateGroupDTO>,
) -> Result<(), String> {
    crate::logging::logged("write_groups", async {
        GroupRepo::new(&state.db).create(&doc_id, &groups).await
    }
    .await)
}
