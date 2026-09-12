use crate::domain::doc_erd::entity::dto::UpdateEntityDTO;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::repository::sqlite::entity::EntityRepo;
use crate::state::AppState;

pub async fn update_schema(state: &AppState, schema: UpdateEntityDTO) -> Result<(), String> {
    EntityRepo::new(&state.db).update(&schema).await
}
