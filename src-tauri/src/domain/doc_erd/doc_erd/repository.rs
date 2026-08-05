use super::dto::{CreateDocErdDTO, UpdateDocErdDTO};
use super::entity::DocErd;

pub trait DocErdRepository {
    async fn all(&self) -> Result<Vec<DocErd>, String>;
    async fn by_domain(&self, domain_id: &str) -> Result<Vec<DocErd>, String>;
    async fn create(&self, dto: &CreateDocErdDTO) -> Result<String, String>;
    async fn update(&self, dto: &UpdateDocErdDTO) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
}
