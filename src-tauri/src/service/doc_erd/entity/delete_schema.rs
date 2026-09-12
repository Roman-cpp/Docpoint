use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::repository::sqlite::entity::EntityRepo;
use crate::state::AppState;

pub async fn delete_schema(state: &AppState, entity_id: String) -> Result<(), String> {
    EntityRepo::new(&state.db).delete(&entity_id).await
}
