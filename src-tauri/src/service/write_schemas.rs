use crate::domain::entity::model::CreateEntityDTO;
use crate::domain::entity::repository::{EntityRepo, EntityRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn write_schemas(
    state: State<'_, AppState>,
    doc_id: String,
    schemas: Vec<CreateEntityDTO>,
) -> Result<(), String> {
    for schema in &schemas {
        EntityRepo::new(&state.db).create(&doc_id, schema).await?;
    }

    Ok(())
}
