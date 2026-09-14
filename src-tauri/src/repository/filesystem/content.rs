use crate::domain::content::repository::ContentRepository;
use std::path::{Path, PathBuf};

/// Файловое хранилище тел документов: один `<node_id>.md` на узел, плоско
/// внутри `root`.
pub struct ContentRepo<'a> {
    root: &'a Path,
}

impl<'a> ContentRepo<'a> {
    pub fn new(root: &'a Path) -> Self {
        Self { root }
    }

    /// Id приходит из фронтенда и становится именем файла, поэтому проверяется
    /// перед тем, как попасть на диск.
    fn path(&self, node_id: &str) -> Result<PathBuf, String> {
        if node_id.is_empty()
            || node_id.contains('/')
            || node_id.contains('\\')
            || node_id.contains('.')
        {
            return Err(format!("invalid id: {node_id:?}"));
        }

        Ok(self.root.join(format!("{node_id}.md")))
    }
}

impl ContentRepository for ContentRepo<'_> {
    async fn read(&self, node_id: &str) -> Result<String, String> {
        let path = self.path(node_id)?;

        match tokio::fs::read_to_string(&path).await {
            Ok(content) => Ok(content),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
            Err(e) => Err(e.to_string()),
        }
    }

    async fn write(&self, node_id: &str, content: &str) -> Result<(), String> {
        let path = self.path(node_id)?;

        tokio::fs::create_dir_all(self.root)
            .await
            .map_err(|e| e.to_string())?;

        tokio::fs::write(&path, content)
            .await
            .map_err(|e| e.to_string())
    }

    /// Отсутствующее тело считается уже удалённым: документ, который ни разу не
    /// открывали, файла не имеет, а удаление должно проходить.
    async fn delete(&self, node_id: &str) -> Result<(), String> {
        let path = self.path(node_id)?;

        match tokio::fs::remove_file(&path).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_ids_that_would_escape_the_store() {
        let repo = ContentRepo::new(Path::new("/content"));

        for bad in ["", "..", "a/b", "a\\b", "a.md"] {
            assert!(repo.path(bad).is_err(), "accepted {bad:?}");
        }

        assert_eq!(
            repo.path("3f2a91c8-0000-4000-8000-000000000000").unwrap(),
            Path::new("/content/3f2a91c8-0000-4000-8000-000000000000.md")
        );
    }
}
