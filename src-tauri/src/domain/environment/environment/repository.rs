use super::dto::{
    CreateEnvironmentDTO, CreateVariableDTO, UpdateEnvironmentDTO, UpdateVariableDTO,
};
use super::entity::{EnvValue, Environment};

pub trait EnvironmentRepository {
    async fn write_configs(
        &self,
        platform_id: Option<&str>,
        configs: &[CreateEnvironmentDTO],
    ) -> Result<(), String>;
    async fn create(
        &self,
        platform_id: &str,
        env: &CreateEnvironmentDTO,
    ) -> Result<Environment, String>;
    async fn duplicate(&self, source_id: &str) -> Result<Environment, String>;
    async fn update(&self, env: &UpdateEnvironmentDTO) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    async fn create_variable(
        &self,
        environment_id: &str,
        variable: &CreateVariableDTO,
    ) -> Result<EnvValue, String>;
    async fn update_variable(&self, variable: &UpdateVariableDTO) -> Result<(), String>;
    async fn delete_variable(&self, id: &str) -> Result<(), String>;
}
