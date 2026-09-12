use crate::domain::file::entity::StoredFile;
use crate::domain::file::repository::DocFileRepository;
use sqlx::{Row, SqlitePool};

pub struct DocFileRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> DocFileRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl DocFileRepository for DocFileRepo<'_> {
    async fn create(&self, id: &str, file: &StoredFile) -> Result<(), String> {
        sqlx::query("INSERT INTO doc_file (id, filename, size) VALUES (?, ?, ?)")
            .bind(id)
            .bind(&file.filename)
            .bind(file.size)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn find(&self, id: &str) -> Result<Option<StoredFile>, String> {
        let row = sqlx::query("SELECT filename, size FROM doc_file WHERE id = ?")
            .bind(id)
            .fetch_optional(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(row.map(|row| StoredFile {
            filename: row.get("filename"),
            size: row.get("size"),
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::catalog::dto::NewNode;
    use crate::domain::catalog::entity::NodeKind;
    use crate::domain::catalog::repository::CatalogRepository;
    use crate::repository::sqlite::catalog::CatalogRepo;
    use crate::repository::sqlite::test_db;

    async fn file_node(pool: &SqlitePool) -> String {
        sqlx::query("INSERT INTO platforms (id, name) VALUES ('p1', 'P')")
            .execute(pool)
            .await
            .unwrap();

        let node = CatalogRepo::new(pool)
            .create(&NewNode {
                platform_id: "p1",
                parent_id: None,
                kind: NodeKind::File,
                name: "Смета.xlsx",
            })
            .await
            .unwrap();

        DocFileRepo::new(pool)
            .create(
                &node.id,
                &StoredFile {
                    filename: "Смета.xlsx".to_string(),
                    size: 4096,
                },
            )
            .await
            .unwrap();

        node.id
    }

    /// Строка файла читается тем же id, что и узел: по ней открывающая команда
    /// находит файл в хранилище.
    #[tokio::test]
    async fn a_file_node_keeps_its_name_on_disk() {
        let pool = test_db::migrated().await;
        let id = file_node(&pool).await;

        let stored = DocFileRepo::new(&pool).find(&id).await.unwrap().unwrap();
        assert_eq!(stored.filename, "Смета.xlsx");
        assert_eq!(stored.size, 4096);

        let missing = DocFileRepo::new(&pool).find("нет такого").await.unwrap();
        assert!(missing.is_none());
    }

    /// Пересборка `catalog_node` в 0039 не должна была растерять каскады: и узел,
    /// и платформа уносят строку файла за собой.
    #[tokio::test]
    async fn deleting_the_node_or_the_platform_takes_the_row() {
        let pool = test_db::migrated().await;
        let id = file_node(&pool).await;

        CatalogRepo::new(&pool).delete(&id).await.unwrap();
        assert!(DocFileRepo::new(&pool).find(&id).await.unwrap().is_none());

        let id = {
            sqlx::query("DELETE FROM platforms WHERE id = 'p1'")
                .execute(&pool)
                .await
                .unwrap();
            file_node(&pool).await
        };

        sqlx::query("DELETE FROM platforms WHERE id = 'p1'")
            .execute(&pool)
            .await
            .unwrap();

        assert!(DocFileRepo::new(&pool).find(&id).await.unwrap().is_none());
        let nodes = CatalogRepo::new(&pool).tree("p1").await.unwrap();
        assert!(nodes.is_empty(), "узлы платформы остались: {nodes:?}");
    }
}
