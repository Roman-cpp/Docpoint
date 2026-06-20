use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use crate::repository::sqlite::entity_relation::RelationRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_relation(
    state: State<'_, AppState>,
    relation_id: String,
) -> Result<(), String> {
    RelationRepo::new(&state.db).delete(&relation_id).await
}
