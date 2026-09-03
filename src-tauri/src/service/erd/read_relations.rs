use crate::domain::doc_erd::entity_relation::entity::EntityRelation;
use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use crate::repository::sqlite::entity_relation::RelationRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_relations(
    state: State<'_, AppState>,
    doc_erd_id: String,
) -> Result<Vec<EntityRelation>, String> {
    crate::logging::logged(
        "read_relations",
        async { RelationRepo::new(&state.db).by_erd(&doc_erd_id).await }.await,
    )
}
