use crate::domain::doc_erd::entity::dto::EntityPositionDTO;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::repository::sqlite::entity::EntityRepo;
use crate::state::AppState;

pub async fn update_schema_positions(
    state: &AppState,
    positions: Vec<EntityPositionDTO>,
) -> Result<(), String> {
    EntityRepo::new(&state.db)
        .update_positions(&positions)
        .await
}
