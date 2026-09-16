use super::dto::{MoveNodeDTO, NewNode, RenameNodeDTO};
use super::entity::CatalogNode;

/// Дерево каталогов и документов одной платформы.
///
/// Реализация отвечает за структурные правила: родителем может быть только
/// каталог той же платформы, узел нельзя перенести внутрь самого себя, имена
/// среди соседей уникальны.
pub trait CatalogRepository {
    /// Все узлы платформы одним списком — дерево собирается вызывающей стороной.
    async fn tree(&self, platform_id: &str) -> Result<Vec<CatalogNode>, String>;
    async fn find(&self, id: &str) -> Result<Option<CatalogNode>, String>;
    /// Узел вместе со всем поддеревом, сам узел первым.
    async fn subtree(&self, id: &str) -> Result<Vec<CatalogNode>, String>;
    async fn create(&self, node: &NewNode<'_>) -> Result<CatalogNode, String>;
    /// Заводит узел с заданным id вместо сгенерированного. Нужен импорту:
    /// id документа живёт в файле, и по нему файл в следующий раз находит
    /// свой документ вместо того, чтобы создавать рядом второй.
    async fn create_with_id(
        &self,
        id: &str,
        node: &NewNode<'_>,
    ) -> Result<CatalogNode, String>;
    async fn rename(&self, dto: &RenameNodeDTO) -> Result<(), String>;
    async fn move_to(&self, dto: &MoveNodeDTO) -> Result<(), String>;
    /// Удаляет узел вместе с поддеревом (каскад по `parent_id`).
    async fn delete(&self, id: &str) -> Result<(), String>;
    /// Отмечает узел изменённым — вызывается при записи тела документа.
    async fn touch(&self, id: &str) -> Result<(), String>;
}
