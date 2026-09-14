use super::entity::DocWebsocket;

/// Полезная нагрузка doc-ws — один адрес. Узел дерева заводит и удаляет
/// репозиторий каталога.
pub trait DocWebsocketRepository {
    async fn all(&self) -> Result<Vec<DocWebsocket>, String>;
    async fn find(&self, id: &str) -> Result<Option<DocWebsocket>, String>;
    async fn create(&self, id: &str, url: &str) -> Result<(), String>;
    async fn update(&self, id: &str, url: &str) -> Result<(), String>;
}
