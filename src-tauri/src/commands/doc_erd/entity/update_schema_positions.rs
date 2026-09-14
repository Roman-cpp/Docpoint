use crate::domain::doc_erd::entity::dto::EntityPositionDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_schema_positions(
    state: State<'_, AppState>,
    positions: Vec<EntityPositionDTO>,
) -> Result<(), String> {
    crate::logging::logged(
        "update_schema_positions",
        crate::service::update_schema_positions(&state, positions).await,
    )
}
