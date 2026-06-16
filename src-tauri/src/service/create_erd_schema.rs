use crate::domain::entity::model::CreateEntityDTO;
use crate::domain::entity::repository::{EntityRepo, EntityRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_erd_schema(
    state: State<'_, AppState>,
    doc_erd_id: String,
    schema: CreateEntityDTO,
) -> Result<String, String> {
    EntityRepo::new(&state.db)
        .create_for_erd(&doc_erd_id, &schema)
        .await
}
