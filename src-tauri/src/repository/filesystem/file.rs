use crate::domain::file::entity::StoredFile;
use crate::domain::file::repository::FileAssetRepository;
use std::path::{Path, PathBuf};

/// Файловое хранилище загруженных файлов: каталог `<node_id>/` на узел, внутри
/// — сам файл под своим именем.
///
/// Каталог на узел, а не файл `<node_id>.<расширение>` плоско в корне, потому
/// что имя файла нужно сохранить целиком: по расширению система выбирает
/// программу, а имя целиком показывает открытая программа.
pub struct FileRepo<'a> {
    root: &'a Path,
}

impl<'a> FileRepo<'a> {
    pub fn new(root: &'a Path) -> Self {
        Self { root }
    }

    /// Id приходит из фронтенда и становится именем каталога, поэтому
    /// проверяется перед тем, как попасть на диск.
    fn dir(&self, node_id: &str) -> Result<PathBuf, String> {
        if node_id.is_empty()
            || node_id.contains('/')
            || node_id.contains('\\')
            || node_id.contains('.')
        {
            return Err(format!("invalid id: {node_id:?}"));
        }

        Ok(self.root.join(node_id))
    }
}

impl FileAssetRepository for FileRepo<'_> {
    async fn store(&self, node_id: &str, source: &Path) -> Result<StoredFile, String> {
        let filename = file_name(source)?;
        let dir = self.dir(node_id)?;

        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(|e| e.to_string())?;

        let size = tokio::fs::copy(source, dir.join(&filename))
            .await
            .map_err(|e| e.to_string())?;

        Ok(StoredFile {
            filename,
            size: size as i64,
        })
    }

    async fn locate(&self, node_id: &str, filename: &str) -> Result<PathBuf, String> {
        let path = self.dir(node_id)?.join(safe_name(filename)?);

        if !tokio::fs::try_exists(&path)
            .await
            .map_err(|e| e.to_string())?
        {
            return Err(format!("файл не найден в хранилище: {filename}"));
        }

        Ok(path)
    }

    /// Отсутствующий каталог считается уже удалённым: узел мог остаться от
    /// неудачной загрузки, и удаление должно проходить.
    async fn delete(&self, node_id: &str) -> Result<(), String> {
        let dir = self.dir(node_id)?;

        match tokio::fs::remove_dir_all(&dir).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

impl FileRepo<'_> {
    /// Пишет байты напрямую, без файла-источника на диске: используется
    /// импортом платформы, где содержимое приходит из распакованного zip, а
    /// не из выбора файла в системном диалоге.
    pub async fn store_bytes(
        &self,
        node_id: &str,
        filename: &str,
        bytes: &[u8],
    ) -> Result<StoredFile, String> {
        let dir = self.dir(node_id)?;
        let name = safe_name(filename)?;

        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(|e| e.to_string())?;

        tokio::fs::write(dir.join(name), bytes)
            .await
            .map_err(|e| e.to_string())?;

        Ok(StoredFile {
            filename: filename.to_string(),
            size: bytes.len() as i64,
        })
    }
}

/// Имя файла из пути. `file_name` сама отсекает каталоги и «..», так что
/// дальше остаётся проверить только пустоту.
fn file_name(source: &Path) -> Result<String, String> {
    source
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .filter(|name| !name.is_empty())
        .ok_or_else(|| format!("не удалось определить имя файла: {}", source.display()))
}

/// Имя, прочитанное из БД. В базу оно попало из пути на диске — проверка на
/// выход за пределы каталога узла нужна и здесь, а не только на записи.
fn safe_name(filename: &str) -> Result<&str, String> {
    if filename.is_empty() || filename == ".." || filename.contains('/') || filename.contains('\\')
    {
        return Err(format!("invalid file name: {filename:?}"));
    }

    Ok(filename)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_ids_that_would_escape_the_store() {
        let repo = FileRepo::new(Path::new("/files"));

        for bad in ["", "..", "a/b", "a\\b", "a.zip"] {
            assert!(repo.dir(bad).is_err(), "accepted {bad:?}");
        }

        assert_eq!(
            repo.dir("3f2a91c8-0000-4000-8000-000000000000").unwrap(),
            Path::new("/files/3f2a91c8-0000-4000-8000-000000000000")
        );
    }

    #[test]
    fn rejects_names_that_would_escape_the_node_directory() {
        for bad in ["", "..", "../secret", "sub/report.pdf", "sub\\report.pdf"] {
            assert!(safe_name(bad).is_err(), "accepted {bad:?}");
        }

        assert_eq!(safe_name("отчёт за май.pdf").unwrap(), "отчёт за май.pdf");
    }
}
