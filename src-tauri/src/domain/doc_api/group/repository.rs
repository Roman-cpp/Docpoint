use super::dto::CreateGroupDTO;
use super::entity::Group;

pub trait GroupRepository {
    async fn all(&self, doc_id: &str) -> Result<Vec<Group>, String>;
    /// Id группы с таким названием. Название — естественный ключ группы при
    /// повторном импорте файла: id групп в файле нет, а тот, что попадает туда
    /// экспортом, после переимпорта на другой машине уже ничего не значит.
    async fn find_by_label(&self, doc_id: &str, label: &str) -> Result<Option<String>, String>;
    async fn create(&self, doc_id: &str, groups: &[CreateGroupDTO]) -> Result<(), String>;
    async fn delete(&self, group_id: &str) -> Result<(), String>;
}
