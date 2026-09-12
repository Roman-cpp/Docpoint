use crate::domain::catalog::entity::NodeKind;
use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::file::repository::{DocFileRepository, FileAssetRepository};
use crate::repository::filesystem::file::FileRepo;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::repository::sqlite::doc_file::DocFileRepo;
use crate::state::AppState;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

/// Открыть загруженный файл той программой, которой этот тип файлов открывается
/// в системе. Своей страницы у такого документа нет: показывать pdf, таблицу
/// или чертёж приложение не умеет, а установленная программа умеет.
pub async fn open_file_node(app: AppHandle, state: &AppState, id: String) -> Result<(), String> {
    let node = CatalogRepo::new(&state.db)
        .find(&id)
        .await?
        .ok_or_else(|| format!("узел не найден: {id}"))?;

    if node.kind != NodeKind::File {
        return Err(format!("«{}» — не файл", node.name));
    }

    let stored = DocFileRepo::new(&state.db)
        .find(&id)
        .await?
        .ok_or_else(|| format!("у «{}» нет файла", node.name))?;

    let path = FileRepo::new(&state.files_dir)
        .locate(&id, &stored.filename)
        .await?;

    app.opener()
        .open_path(path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| e.to_string())
}
