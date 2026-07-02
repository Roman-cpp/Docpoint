pub trait DirectoryRepository {
    async fn create_dir(&self, parent: &str, name: &str) -> Result<String, String>;
    async fn delete_dir(&self, id: &str) -> Result<(), String>;
}
