use super::entity::StoredFile;
use std::path::{Path, PathBuf};

/// Хранилище загруженных файлов. Файл забирается копией: оригинал может лежать
/// на флешке или в «Загрузках», а документ должен открываться и через месяц.
pub trait FileAssetRepository {
    /// Забрать файл в хранилище узла.
    async fn store(&self, node_id: &str, source: &Path) -> Result<StoredFile, String>;
    /// Путь к лежащему файлу — по нему его открывает система.
    async fn locate(&self, node_id: &str, filename: &str) -> Result<PathBuf, String>;
    async fn delete(&self, node_id: &str) -> Result<(), String>;
}

/// Строка загруженного файла — всё, что есть у такого узла сверх дерева.
pub trait DocFileRepository {
    async fn create(&self, id: &str, file: &StoredFile) -> Result<(), String>;
    async fn find(&self, id: &str) -> Result<Option<StoredFile>, String>;
}
