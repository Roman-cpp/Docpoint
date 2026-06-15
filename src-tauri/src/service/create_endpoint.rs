use crate::domain::endpoint::model::CreateEndpointDTO;
use crate::domain::endpoint::repository::{EndpointRepo, EndpointRepository};
use crate::domain::group::repository::GroupRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_endpoint(
    state: State<'_, AppState>,
    doc_id: String,
    group_id: Option<String>,
    group_label: Option<String>,
    endpoint: CreateEndpointDTO,
) -> Result<(), String> {
    // Определяем целевую группу: либо существующую (`group_id`),
    // либо создаём новую с названием `group_label`.
    let group_id = match group_id {
        Some(id) => id,
        None => {
            let label = group_label
                .as_deref()
                .map(str::trim)
                .filter(|l| !l.is_empty())
                .ok_or_else(|| "group_id or group_label is required".to_string())?;

            GroupRepo::new(&state.db)
                .create_group(&doc_id, label)
                .await?
        }
    };

    EndpointRepo::new(&state.db)
        .create(&group_id, &endpoint)
        .await
}
