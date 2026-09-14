use crate::domain::doc_erd::entity_relation::entity::EntityRelation;
use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use crate::repository::sqlite::entity_relation::RelationRepo;
use crate::state::AppState;

pub async fn read_relations(
    state: &AppState,
    doc_erd_id: String,
) -> Result<Vec<EntityRelation>, String> {
    RelationRepo::new(&state.db).by_erd(&doc_erd_id).await
}
