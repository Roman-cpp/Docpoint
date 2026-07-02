use crate::domain::{
    doc_api::doc_api::dto::UpdateDocApiDTO,
    environment::environment::entity::Environment,
};

use super::dto::CreateDocApiDTO;
use super::entity::DocApi;

pub trait DocRepository {
    async fn all(&self) -> Result<Vec<DocApi>, String>;
    async fn find(&self, id: &str) -> Result<Option<DocApi>, String>;
    async fn create(&self, doc: &CreateDocApiDTO) -> Result<String, String>;
    async fn update(&self, doc: &UpdateDocApiDTO) -> Result<String, String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    async fn environments_by_doc(
      &self,
      doc_id: &str,
  ) -> Result<Vec<Environment>, String>;
}
