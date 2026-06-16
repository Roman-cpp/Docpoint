use crate::domain::entity_relation::model::EntityRelation;
use crate::domain::entity_relation::repository::{RelationRepo, RelationRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_relations(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<EntityRelation>, String> {
    RelationRepo::new(&state.db).by_doc(&doc_id).await
}
