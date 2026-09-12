use crate::domain::doc_erd::entity_relation::dto::RelationEndpointsDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_relation(
    state: State<'_, AppState>,
    relation: RelationEndpointsDTO,
) -> Result<String, String> {
    crate::logging::logged(
        "create_relation",
        crate::service::create_relation(&state, relation).await,
    )
}
