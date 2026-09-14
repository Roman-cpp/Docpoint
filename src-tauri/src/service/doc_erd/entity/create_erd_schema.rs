use crate::domain::doc_erd::entity::dto::CreateEntityDTO;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::repository::sqlite::entity::EntityRepo;
use crate::state::AppState;

pub async fn create_erd_schema(
    state: &AppState,
    doc_erd_id: String,
    schema: CreateEntityDTO,
) -> Result<String, String> {
    EntityRepo::new(&state.db)
        .create_for_erd(&doc_erd_id, &schema)
        .await
}
