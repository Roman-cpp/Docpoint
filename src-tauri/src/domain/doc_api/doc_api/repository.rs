use crate::domain::environment::environment::entity::Environment;

use super::dto::DocApiPayload;
use super::entity::DocApi;

/// Полезная нагрузка doc-api. Строку узла заводит и правит репозиторий дерева,
/// поэтому здесь нет ни create со своим id, ни delete: узел уносит документ
/// каскадом.
pub trait DocApiRepository {
    async fn all(&self) -> Result<Vec<DocApi>, String>;
    async fn find(&self, id: &str) -> Result<Option<DocApi>, String>;
    /// Заводит поля документа для уже созданного узла.
    async fn create(&self, id: &str, payload: &DocApiPayload) -> Result<(), String>;
    async fn update(&self, id: &str, payload: &DocApiPayload) -> Result<(), String>;
    /// Окружения платформы, которой принадлежит документ.
    async fn environments_by_doc(&self, doc_id: &str) -> Result<Vec<Environment>, String>;
}
