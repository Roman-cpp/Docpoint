use crate::domain::doc_erd::entity::dto::CreateEntityDTO;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::repository::sqlite::entity::EntityRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_schema(
    state: State<'_, AppState>,
    doc_id: String,
    schema: CreateEntityDTO,
) -> Result<String, String> {
    EntityRepo::new(&state.db).create(&doc_id, &schema).await
}
