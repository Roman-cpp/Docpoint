use crate::domain::directory::repository::DirectoryRepository;
use crate::repository::filesystem::directory::DirectoryRepo;
use crate::state::AppState;
use tauri::State;

/// Delete a folder and everything inside it, by its vault-relative id.
#[tauri::command]
pub async fn delete_directory(state: State<'_, AppState>, id: String) -> Result<(), String> {
    DirectoryRepo::new(&state.vault_dir).delete_dir(&id).await
}
