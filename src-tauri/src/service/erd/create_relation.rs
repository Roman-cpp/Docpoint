use crate::domain::doc_erd::entity_relation::dto::RelationEndpointsDTO;
use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use crate::repository::sqlite::entity_relation::RelationRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_relation(
    state: State<'_, AppState>,
    relation: RelationEndpointsDTO,
) -> Result<String, String> {
    crate::logging::logged("create_relation", async {
        RelationRepo::new(&state.db).create(&relation).await
    }
    .await)
}
