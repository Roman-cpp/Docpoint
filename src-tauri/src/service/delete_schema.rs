use crate::domain::entity::repository::{EntityRepo, EntityRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_schema(
    state: State<'_, AppState>,
    entity_id: String,
) -> Result<(), String> {
    EntityRepo::new(&state.db).delete(&entity_id).await
}
