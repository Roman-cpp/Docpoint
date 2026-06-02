use super::model::{
    CreateEnvironmentDTO, CreateVariableDTO, EnvValue, Environment, UpdateEnvironmentDTO,
    UpdateVariableDTO,
};
use sqlx::SqlitePool;
use uuid::Uuid;

pub trait EnvironmentRepository {
    async fn write_configs(
        &self,
        environmentable_id: &str,
        environmentable_type: &str,
        configs: &[CreateEnvironmentDTO],
    ) -> Result<(), String>;
    async fn create(
        &self,
        environmentable_id: &str,
        environmentable_type: &str,
        env: &CreateEnvironmentDTO,
    ) -> Result<Environment, String>;
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

pub struct EnvironmentRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> EnvironmentRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl EnvironmentRepository for EnvironmentRepo<'_> {
    async fn write_configs(
        &self,
        environmentable_id: &str,
        environmentable_type: &str,
        configs: &[CreateEnvironmentDTO],
    ) -> Result<(), String> {
        for config in configs {
            let env_id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO environments (id, environmentable_id, environmentable_type, env, label, base_url, prefix) VALUES (?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&env_id)
            .bind(environmentable_id)
            .bind(environmentable_type)
            .bind(&config.env)
            .bind(&config.label)
            .bind(&config.base_url)
            .bind(&config.prefix)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

            for var in &config.value {
                sqlx::query("INSERT INTO variables (environments_id, key, value) VALUES (?, ?, ?)")
                    .bind(&env_id)
                    .bind(&var.name)
                    .bind(&var.value)
                    .execute(self.db)
                    .await
                    .map_err(|e| e.to_string())?;
            }
        }

        Ok(())
    }

    async fn create(
        &self,
        environmentable_id: &str,
        environmentable_type: &str,
        env: &CreateEnvironmentDTO,
    ) -> Result<Environment, String> {
        let env_id = Uuid::new_v4().to_string();

        sqlx::query(
            "INSERT INTO environments (id, environmentable_id, environmentable_type, env, label, base_url, prefix) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&env_id)
        .bind(environmentable_id)
        .bind(environmentable_type)
        .bind(&env.env)
        .bind(&env.label)
        .bind(&env.base_url)
        .bind(&env.prefix)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;

        let mut values = Vec::new();
        for var in &env.value {
            let var_id = Uuid::new_v4().to_string();
            sqlx::query("INSERT INTO variables (id, environments_id, key, value) VALUES (?, ?, ?, ?)")
                .bind(&var_id)
                .bind(&env_id)
                .bind(&var.name)
                .bind(&var.value)
                .execute(self.db)
                .await
                .map_err(|e| e.to_string())?;

            values.push(EnvValue {
                id: var_id,
                name: var.name.clone(),
                value: var.value.clone(),
            });
        }

        Ok(Environment {
            id: env_id,
            env: env.env.clone(),
            label: env.label.clone(),
            base_url: env.base_url.clone(),
            prefix: env.prefix.clone(),
            value: values,
            access_token: "".to_string(),
        })
    }

    async fn update(&self, env: &UpdateEnvironmentDTO) -> Result<(), String> {
        sqlx::query("UPDATE environments SET label = ?, base_url = ?, prefix = ? WHERE id = ?")
            .bind(&env.label)
            .bind(&env.base_url)
            .bind(&env.prefix)
            .bind(&env.id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        let mut conn = self.db.acquire().await.map_err(|e| e.to_string())?;

        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;

        sqlx::query("DELETE FROM environments WHERE id = ?")
            .bind(id)
            .execute(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn create_variable(
        &self,
        environment_id: &str,
        variable: &CreateVariableDTO,
    ) -> Result<EnvValue, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO variables (id, environments_id, key, value) VALUES (?, ?, ?, ?)")
            .bind(&id)
            .bind(environment_id)
            .bind(&variable.name)
            .bind(&variable.value)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(EnvValue {
            id,
            name: variable.name.clone(),
            value: variable.value.clone(),
        })
    }

    async fn update_variable(&self, variable: &UpdateVariableDTO) -> Result<(), String> {
        sqlx::query("UPDATE variables SET key = ?, value = ? WHERE id = ?")
            .bind(&variable.name)
            .bind(&variable.value)
            .bind(&variable.id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn delete_variable(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM variables WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
