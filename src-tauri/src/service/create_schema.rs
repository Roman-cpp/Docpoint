use crate::domain::entity::model::CreateEntityDTO;
use crate::domain::entity::repository::{EntityRepo, EntityRepository};
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
