use crate::domain::catalog::entity::NodeKind;
use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::file::entity::PickedFile;
use crate::domain::file::repository::{DocFileRepository, FileAssetRepository};
use crate::repository::filesystem::file::FileRepo;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::repository::sqlite::doc_file::DocFileRepo;
use crate::state::AppState;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

/// Системный диалог выбора файла — любого, без фильтров по типу.
///
/// Путь нужен именно от бэкенда: файл забирается в хранилище копированием, а у
/// `File` из веб-инпута пути нет — содержимое пришлось бы гнать через IPC,
/// причём целиком в память.
#[tauri::command]
pub async fn pick_file() -> Result<Option<PickedFile>, String> {
    crate::logging::logged("pick_file", async {
        let path = tokio::task::spawn_blocking(move || rfd::FileDialog::new().pick_file())
            .await
            .map_err(|e| e.to_string())?;

        let Some(path) = path else {
            return Ok(None);
        };

        // Размер здесь только для показа в окне создания, поэтому недоступный файл
        // не повод отказывать в выборе: о настоящей беде скажет копирование.
        let size = tokio::fs::metadata(&path)
            .await
            .map(|meta| meta.len() as i64)
            .unwrap_or(0);

        Ok(Some(PickedFile {
            name: path
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_default(),
            path: path.to_string_lossy().to_string(),
            size,
        }))
    }
    .await)
}

/// Открыть загруженный файл той программой, которой этот тип файлов открывается
/// в системе. Своей страницы у такого документа нет: показывать pdf, таблицу
/// или чертёж приложение не умеет, а установленная программа умеет.
#[tauri::command]
pub async fn open_file_node(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    crate::logging::logged("open_file_node", async {
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
    .await)
}
