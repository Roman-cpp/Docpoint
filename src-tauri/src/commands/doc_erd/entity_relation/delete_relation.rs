use crate::domain::doc_erd::entity_relation::dto::RelationEndpointsDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_relation(
    state: State<'_, AppState>,
    relation: RelationEndpointsDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "delete_relation",
        crate::service::delete_relation(&state, relation).await,
    )
}
