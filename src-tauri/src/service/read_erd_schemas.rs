use crate::domain::entity::model::Entity;
use crate::domain::entity::repository::{EntityRepo, EntityRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_erd_schemas(
    state: State<'_, AppState>,
    doc_erd_id: String,
) -> Result<Vec<Entity>, String> {
    EntityRepo::new(&state.db).all_by_erd(&doc_erd_id).await
}
