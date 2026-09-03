use crate::domain::catalog::dto::RenameNodeDTO;
use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::websocket::doc_websocket::dto::UpdateDocWebsocketDTO;
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::repository::sqlite::doc_websocket::DocWebsocketRepo;
use crate::state::AppState;
use tauri::State;

/// Имя сокета лежит в узле дерева, адрес — в его полезной нагрузке, поэтому
/// правка идёт в две таблицы.
#[tauri::command]
pub async fn update_websocket(
    state: State<'_, AppState>,
    websocket: UpdateDocWebsocketDTO,
) -> Result<(), String> {
    crate::logging::logged("update_websocket", async {
        CatalogRepo::new(&state.db)
            .rename(&RenameNodeDTO {
                id: websocket.id.clone(),
                name: websocket.name.clone(),
            })
            .await?;

        DocWebsocketRepo::new(&state.db)
            .update(&websocket.id, &websocket.url)
            .await
    }
    .await)
}
