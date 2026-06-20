use crate::domain::{
    doc_api::doc_api::dto::UpdateDocDTO,
    environment::environment::entity::Environment,
};

use super::dto::CreateDocDTO;
use super::entity::DocApi;

pub trait DocRepository {
    async fn all(&self) -> Result<Vec<DocApi>, String>;
    async fn find(&self, id: &str) -> Result<Option<DocApi>, String>;
    async fn create(&self, doc: &CreateDocDTO) -> Result<String, String>;
    async fn update(&self, doc: &UpdateDocDTO) -> Result<String, String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    async fn environments_by_doc(
      &self,
      doc_id: &str,
  ) -> Result<Vec<Environment>, String>;
}
