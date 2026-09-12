use crate::domain::doc_erd::entity_relation::dto::RelationEndpointsDTO;
use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use crate::repository::sqlite::entity_relation::RelationRepo;
use crate::state::AppState;

pub async fn create_relation(
    state: &AppState,
    relation: RelationEndpointsDTO,
) -> Result<String, String> {
    RelationRepo::new(&state.db).create(&relation).await
}
