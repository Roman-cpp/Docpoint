use crate::state::AppState;
use super::model::{CreateEntity, Entity};
use super::repository::{EntityRepo, EntityRepository};
use tauri::State;

#[tauri::command]
pub async fn read_schemas(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<Entity>, String> {
    EntityRepo::new(&state.db).all(&doc_id).await
}

#[tauri::command]
pub async fn write_schemas(
    state: State<'_, AppState>,
    doc_id: String,
    schemas: Vec<CreateEntity>,
) -> Result<(), String> {
    EntityRepo::new(&state.db).create(&doc_id, &schemas).await
}
