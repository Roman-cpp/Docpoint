use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::repository::sqlite::entity::EntityRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_schema(
    state: State<'_, AppState>,
    entity_id: String,
) -> Result<(), String> {
    crate::logging::logged("delete_schema", async {
        EntityRepo::new(&state.db).delete(&entity_id).await
    }
    .await)
}
