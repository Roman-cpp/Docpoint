use crate::domain::doc_erd::entity_relation::entity::EntityRelation;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_relations(
    state: State<'_, AppState>,
    doc_erd_id: String,
) -> Result<Vec<EntityRelation>, String> {
    crate::logging::logged(
        "read_relations",
        crate::service::read_relations(&state, doc_erd_id).await,
    )
}
