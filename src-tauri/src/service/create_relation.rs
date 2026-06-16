use crate::domain::entity_relation::model::CreateRelationDTO;
use crate::domain::entity_relation::repository::{RelationRepo, RelationRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_relation(
    state: State<'_, AppState>,
    relation: CreateRelationDTO,
) -> Result<String, String> {
    RelationRepo::new(&state.db).create(&relation).await
}
