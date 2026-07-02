use super::dto::{CreateMarkdownDTO, UpdateMarkdownDTO};
use super::entity::{DirListing, MarkdownFile};
use std::path::Path;

pub trait MarkdownRepository {
    async fn all(&self) -> Result<Vec<MarkdownFile>, String>;
    async fn list(&self, folder: &str) -> Result<DirListing, String>;
    async fn find(&self, id: &str) -> Result<Option<MarkdownFile>, String>;
    async fn create(&self, dto: &CreateMarkdownDTO) -> Result<String, String>;
    async fn import(&self, src: &Path, folder: &str) -> Result<String, String>;
    async fn update(&self, dto: &UpdateMarkdownDTO) -> Result<String, String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
}
