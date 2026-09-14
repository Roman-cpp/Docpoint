use crate::domain::doc_erd::entity_relation::dto::RelationEndpointsDTO;
use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use crate::repository::sqlite::entity_relation::RelationRepo;
use crate::state::AppState;

pub async fn delete_relation(
    state: &AppState,
    relation: RelationEndpointsDTO,
) -> Result<(), String> {
    RelationRepo::new(&state.db).delete(&relation).await
}
