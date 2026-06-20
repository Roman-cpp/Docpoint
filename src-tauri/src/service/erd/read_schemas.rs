use crate::domain::doc_erd::entity::entity::Entity;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::repository::sqlite::entity::EntityRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_schemas(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<Entity>, String> {
    EntityRepo::new(&state.db).all(&doc_id).await
}
