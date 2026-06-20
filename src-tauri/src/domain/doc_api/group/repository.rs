use super::dto::CreateGroupDTO;
use super::entity::Group;

pub trait GroupRepository {
    async fn all(&self, doc_id: &str) -> Result<Vec<Group>, String>;
    async fn create(&self, doc_id: &str, groups: &[CreateGroupDTO]) -> Result<(), String>;
    async fn delete(&self, group_id: &str) -> Result<(), String>;
}
