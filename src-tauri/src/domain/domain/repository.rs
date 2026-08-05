use super::entity::{Domain};
use super::dto::{CreateDomainDTO, UpdateDomainDTO};
use crate::domain::doc_api::doc_api::entity::DocApi;

pub trait DomainRepository {
    async fn all(&self) -> Result<Vec<Domain>, String>;
    async fn find_by_id(&self, id: &str) -> Result<Option<Domain>, String>;
    async fn by_platform(&self, platform_id: &str) -> Result<Vec<Domain>, String>;
    async fn create(&self, domain: &CreateDomainDTO) -> Result<Domain, String>;
    async fn update(&self, domain: &UpdateDomainDTO) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    async fn attach_doc(&self, domain_id: &str, doc_id: &str) -> Result<(), String>;
    async fn docs_by_domain(&self, domain_id: &str) -> Result<Vec<DocApi>, String>;
}
