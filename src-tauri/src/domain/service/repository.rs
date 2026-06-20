use super::entity::{Service};
use super::dto::{CreateServiceDTO, UpdateServiceDTO};
use crate::domain::doc_api::doc_api::entity::DocApi;

pub trait ServiceRepository {
    async fn all(&self) -> Result<Vec<Service>, String>;
    async fn find_by_id(&self, id: &str) -> Result<Option<Service>, String>;
    async fn by_platform(&self, platform_id: &str) -> Result<Vec<Service>, String>;
    async fn create(&self, service: &CreateServiceDTO) -> Result<Service, String>;
    async fn update(&self, service: &UpdateServiceDTO) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    async fn attach_doc(&self, service_id: &str, doc_id: &str) -> Result<(), String>;
    async fn docs_by_service(&self, service_id: &str) -> Result<Vec<DocApi>, String>;
}
