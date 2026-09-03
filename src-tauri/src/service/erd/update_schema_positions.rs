use crate::domain::doc_erd::entity::dto::EntityPositionDTO;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::repository::sqlite::entity::EntityRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_schema_positions(
    state: State<'_, AppState>,
    positions: Vec<EntityPositionDTO>,
) -> Result<(), String> {
    crate::logging::logged(
        "update_schema_positions",
        async {
            EntityRepo::new(&state.db)
                .update_positions(&positions)
                .await
        }
        .await,
    )
}
