use crate::domain::entity::model::UpdateEntityDTO;
use crate::domain::entity::repository::{EntityRepo, EntityRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_schema(
    state: State<'_, AppState>,
    schema: UpdateEntityDTO,
) -> Result<(), String> {
    EntityRepo::new(&state.db).update(&schema).await
}
