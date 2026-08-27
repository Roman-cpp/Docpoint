use super::dto::{CreatePlatformDTO, UpdatePlatformDTO};
use super::entity::Platform;
use crate::domain::environment::environment::entity::Environment;

pub trait PlatformRepository {
    async fn all(&self) -> Result<Vec<Platform>, String>;
    async fn find_by_id(&self, id: &str) -> Result<Option<Platform>, String>;
    async fn create(&self, platform: &CreatePlatformDTO) -> Result<Platform, String>;
    async fn update(&self, platform: &UpdatePlatformDTO) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    async fn environments_by_platform(&self, platform_id: &str) -> Result<Vec<Environment>, String>;
}
