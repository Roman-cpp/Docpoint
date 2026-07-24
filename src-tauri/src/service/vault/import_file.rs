use crate::domain::vault::repository::VaultRepository;
use crate::domain::vault::scope::FileScope;
use crate::service::vault::scope::scope_repo;
use crate::state::AppState;
use std::path::Path;
use tauri::State;

/// Copy a file dragged in from the OS into `path`, keeping its name. Returns
/// the stored file's scope-relative path.
#[tauri::command]
pub async fn import_file(
    state: State<'_, AppState>,
    scope: FileScope,
    path: String,
    src_path: String,
) -> Result<String, String> {
    scope_repo(&state, &scope)
        .await?
        .import_file(&path, Path::new(&src_path))
        .await
}
