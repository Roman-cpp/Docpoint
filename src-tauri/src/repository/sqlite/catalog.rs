use crate::domain::catalog::dto::{MoveNodeDTO, NewNode, RenameNodeDTO};
use crate::domain::catalog::entity::{CatalogNode, NodeKind};
use crate::domain::catalog::repository::CatalogRepository;
use sqlx::{sqlite::SqliteRow, Row, SqlitePool};
use uuid::Uuid;

/// Колонки узла, которые читает [`node_from_row`]. Имена уточнены таблицей: в
/// запросе поддерева те же `id` и `name` есть и у рекурсивной выборки.
const COLUMNS: &str = "catalog_node.id, catalog_node.platform_id, catalog_node.parent_id, \
                       catalog_node.kind, catalog_node.name, \
                       catalog_node.created_at, catalog_node.updated_at";

pub struct CatalogRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> CatalogRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }

    /// Проверяет, что узел можно положить в этого родителя: родитель существует,
    /// это каталог и он на той же платформе. `None` — корень платформы, он есть
    /// всегда.
    async fn ensure_parent(
        &self,
        platform_id: &str,
        parent_id: Option<&str>,
    ) -> Result<(), String> {
        let Some(parent_id) = parent_id else {
            return Ok(());
        };

        let parent = self
            .find(parent_id)
            .await?
            .ok_or_else(|| format!("каталог не найден: {parent_id}"))?;

        if !parent.kind.is_container() {
            return Err(format!("«{}» — не каталог", parent.name));
        }
        if parent.platform_id != platform_id {
            return Err("нельзя перенести узел на другую платформу".to_string());
        }

        Ok(())
    }
}

impl CatalogRepository for CatalogRepo<'_> {
    async fn tree(&self, platform_id: &str) -> Result<Vec<CatalogNode>, String> {
        let rows = sqlx::query(&format!(
            "SELECT {COLUMNS} FROM catalog_node WHERE platform_id = ? ORDER BY catalog_node.name"
        ))
        .bind(platform_id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        rows.iter().map(node_from_row).collect()
    }

    async fn find(&self, id: &str) -> Result<Option<CatalogNode>, String> {
        let row = sqlx::query(&format!(
            "SELECT {COLUMNS} FROM catalog_node WHERE catalog_node.id = ?"
        ))
        .bind(id)
        .fetch_optional(self.db)
        .await
        .map_err(|e| e.to_string())?;

        row.as_ref().map(node_from_row).transpose()
    }

    /// Обход вниз по `parent_id`. Сам узел идёт первым, дальше — уровень за
    /// уровнем, так что удалять тела документов можно прямо по этому списку.
    async fn subtree(&self, id: &str) -> Result<Vec<CatalogNode>, String> {
        let rows = sqlx::query(&format!(
            "WITH RECURSIVE sub(id, depth) AS ( \
                 SELECT id, 0 FROM catalog_node WHERE id = ? \
                 UNION ALL \
                 SELECT n.id, sub.depth + 1 FROM catalog_node n JOIN sub ON n.parent_id = sub.id \
             ) \
             SELECT {COLUMNS} FROM catalog_node \
             JOIN sub ON sub.id = catalog_node.id \
             ORDER BY sub.depth, catalog_node.name"
        ))
        .bind(id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        rows.iter().map(node_from_row).collect()
    }

    async fn create(&self, node: &NewNode<'_>) -> Result<CatalogNode, String> {
        self.create_with_id(&Uuid::new_v4().to_string(), node).await
    }

    async fn create_with_id(&self, id: &str, node: &NewNode<'_>) -> Result<CatalogNode, String> {
        let name = node.name.trim();
        if name.is_empty() {
            return Err("имя не может быть пустым".to_string());
        }

        self.ensure_parent(node.platform_id, node.parent_id).await?;

        sqlx::query(
            "INSERT INTO catalog_node (id, platform_id, parent_id, kind, name) \
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(id)
        .bind(node.platform_id)
        .bind(node.parent_id)
        .bind(node.kind.as_db())
        .bind(name)
        .execute(self.db)
        .await
        .map_err(|e| write_error(e, name))?;

        self.find(id)
            .await?
            .ok_or_else(|| "не удалось прочитать созданный узел".to_string())
    }

    async fn rename(&self, dto: &RenameNodeDTO) -> Result<(), String> {
        let name = dto.name.trim();
        if name.is_empty() {
            return Err("имя не может быть пустым".to_string());
        }

        sqlx::query("UPDATE catalog_node SET name = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(name)
            .bind(&dto.id)
            .execute(self.db)
            .await
            .map_err(|e| write_error(e, name))?;

        Ok(())
    }

    /// Перенос внутрь собственного поддерева отцепил бы ветку от дерева, поэтому
    /// проверяется отдельно — каскад `parent_id` такой цикл не ловит.
    async fn move_to(&self, dto: &MoveNodeDTO) -> Result<(), String> {
        let node = self
            .find(&dto.id)
            .await?
            .ok_or_else(|| format!("узел не найден: {}", dto.id))?;

        let parent_id = dto.parent_id.as_deref();

        if parent_id == node.parent_id.as_deref() {
            return Ok(());
        }

        self.ensure_parent(&node.platform_id, parent_id).await?;

        if let Some(parent_id) = parent_id {
            if self
                .subtree(&node.id)
                .await?
                .iter()
                .any(|n| n.id == parent_id)
            {
                return Err("нельзя перенести каталог внутрь самого себя".to_string());
            }
        }

        sqlx::query(
            "UPDATE catalog_node SET parent_id = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(parent_id)
        .bind(&node.id)
        .execute(self.db)
        .await
        .map_err(|e| write_error(e, &node.name))?;

        Ok(())
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM catalog_node WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn touch(&self, id: &str) -> Result<(), String> {
        sqlx::query("UPDATE catalog_node SET updated_at = datetime('now') WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}

fn node_from_row(row: &SqliteRow) -> Result<CatalogNode, String> {
    Ok(CatalogNode {
        id: row.get("id"),
        platform_id: row.get("platform_id"),
        parent_id: row.get("parent_id"),
        kind: NodeKind::from_db(row.get::<String, _>("kind").as_str())?,
        name: row.get("name"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

/// Уникальный индекс по (платформа, родитель, имя) — единственная ошибка записи,
/// которую пользователь может исправить сам, поэтому она объясняется словами.
fn write_error(error: sqlx::Error, name: &str) -> String {
    let text = error.to_string();

    if text.contains("UNIQUE constraint failed") {
        return format!("в этом каталоге уже есть «{name}»");
    }

    text
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::catalog::entity::NodeKind;
    use crate::repository::sqlite::test_db;

    /// Платформа с пустым деревом.
    async fn db() -> SqlitePool {
        let pool = test_db::migrated().await;
        sqlx::query("INSERT INTO platforms (id, name) VALUES ('p1', 'P')")
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    async fn node(
        repo: &CatalogRepo<'_>,
        parent: Option<&str>,
        kind: NodeKind,
        name: &str,
    ) -> CatalogNode {
        repo.create(&NewNode {
            platform_id: "p1",
            parent_id: parent,
            kind,
            name,
        })
        .await
        .unwrap()
    }

    /// Как в проводнике: в одной папке двух «Биллингов» быть не может — и вид
    /// узла тут ничего не меняет, иначе каталог и документ с одним именем
    /// смотрелись бы одинаково.
    #[tokio::test]
    async fn siblings_cannot_share_a_name() {
        let pool = db().await;
        let repo = CatalogRepo::new(&pool);

        let billing = node(&repo, None, NodeKind::Catalog, "Биллинг").await;

        let err = repo
            .create(&NewNode {
                platform_id: "p1",
                parent_id: None,
                kind: NodeKind::DocApi,
                name: "Биллинг",
            })
            .await
            .unwrap_err();
        assert!(err.contains("Биллинг"), "невнятная подсказка: {err}");

        // В другом каталоге то же имя свободно.
        node(&repo, Some(&billing.id), NodeKind::DocApi, "Биллинг").await;
    }

    /// Документы — листья дерева: положить узел внутрь doc-api нельзя.
    #[tokio::test]
    async fn only_a_catalog_can_hold_children() {
        let pool = db().await;
        let repo = CatalogRepo::new(&pool);

        let doc = node(&repo, None, NodeKind::DocApi, "Payments").await;

        let err = repo
            .create(&NewNode {
                platform_id: "p1",
                parent_id: Some(&doc.id),
                kind: NodeKind::Markdown,
                name: "notes.md",
            })
            .await
            .unwrap_err();
        assert!(err.contains("не каталог"), "невнятная подсказка: {err}");
    }

    /// Перенос каталога в собственное поддерево отцепил бы ветку от дерева.
    #[tokio::test]
    async fn a_catalog_cannot_move_inside_itself() {
        let pool = db().await;
        let repo = CatalogRepo::new(&pool);

        let outer = node(&repo, None, NodeKind::Catalog, "Биллинг").await;
        let inner = node(&repo, Some(&outer.id), NodeKind::Catalog, "Схема").await;

        let err = repo
            .move_to(&MoveNodeDTO {
                id: outer.id.clone(),
                parent_id: Some(inner.id),
            })
            .await
            .unwrap_err();
        assert!(
            err.contains("внутрь самого себя"),
            "невнятная подсказка: {err}"
        );

        // Наверх, в корень платформы, тот же каталог переезжает свободно.
        repo.move_to(&MoveNodeDTO {
            id: outer.id.clone(),
            parent_id: None,
        })
        .await
        .unwrap();
    }

    /// Поддерево нужно, чтобы удалить тела документов до того, как каскад унесёт
    /// сами узлы, — поэтому в него входит и сам узел.
    #[tokio::test]
    async fn deleting_a_catalog_takes_its_whole_subtree() {
        let pool = db().await;
        let repo = CatalogRepo::new(&pool);

        let billing = node(&repo, None, NodeKind::Catalog, "Биллинг").await;
        let schema = node(&repo, Some(&billing.id), NodeKind::Catalog, "Схема").await;
        node(&repo, Some(&schema.id), NodeKind::DocErd, "Billing ERD").await;
        let realtime = node(&repo, None, NodeKind::Catalog, "Realtime").await;

        let subtree = repo.subtree(&billing.id).await.unwrap();
        assert_eq!(
            subtree.iter().map(|n| n.name.as_str()).collect::<Vec<_>>(),
            ["Биллинг", "Схема", "Billing ERD"],
            "поддерево идёт сверху вниз, начиная с самого узла"
        );

        repo.delete(&billing.id).await.unwrap();

        let left = repo.tree("p1").await.unwrap();
        assert_eq!(
            left.iter().map(|n| n.id.as_str()).collect::<Vec<_>>(),
            [realtime.id.as_str()],
            "соседняя ветка удаление пережила"
        );
    }

    /// Узлы чужой платформы в дерево не попадают и родителем стать не могут.
    #[tokio::test]
    async fn a_node_stays_on_its_own_platform() {
        let pool = db().await;
        let repo = CatalogRepo::new(&pool);
        sqlx::query("INSERT INTO platforms (id, name) VALUES ('p2', 'P2')")
            .execute(&pool)
            .await
            .unwrap();

        let mine = node(&repo, None, NodeKind::Catalog, "Биллинг").await;
        let other = repo
            .create(&NewNode {
                platform_id: "p2",
                parent_id: None,
                kind: NodeKind::Catalog,
                name: "Чужой",
            })
            .await
            .unwrap();

        assert_eq!(repo.tree("p1").await.unwrap().len(), 1);

        let err = repo
            .move_to(&MoveNodeDTO {
                id: mine.id,
                parent_id: Some(other.id),
            })
            .await
            .unwrap_err();
        assert!(
            err.contains("другую платформу"),
            "невнятная подсказка: {err}"
        );
    }
}
