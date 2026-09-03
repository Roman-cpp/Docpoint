use crate::domain::doc_erd::entity::dto::CreateEntityDTO;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::repository::sqlite::entity::EntityRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_erd_schema(
    state: State<'_, AppState>,
    doc_erd_id: String,
    schema: CreateEntityDTO,
) -> Result<String, String> {
    crate::logging::logged(
        "create_erd_schema",
        async {
            EntityRepo::new(&state.db)
                .create_for_erd(&doc_erd_id, &schema)
                .await
        }
        .await,
    )
}
