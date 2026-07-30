use crate::domain::environment::environment::dto::{
    CreateEnvironmentDTO, CreateVariableDTO, UpdateEnvironmentDTO, UpdateVariableDTO,
};
use crate::domain::environment::environment::entity::{EnvValue, Environment};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;
use crate::domain::environment::environment::repository::EnvironmentRepository;

pub struct EnvironmentRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> EnvironmentRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl EnvironmentRepository for EnvironmentRepo<'_> {
    async fn create(
        &self,
        platform_id: &str,
        env: &CreateEnvironmentDTO,
    ) -> Result<Environment, String> {
        let env_id = Uuid::new_v4().to_string();

        sqlx::query(
            "INSERT INTO environments (id, platform_id, env, label, base_url, prefix) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&env_id)
        .bind(platform_id)
        .bind(&env.env)
        .bind(&env.label)
        .bind(&env.base_url)
        .bind(&env.prefix)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(Environment {
            id: env_id,
            env: env.env.clone(),
            label: env.label.clone(),
            base_url: env.base_url.clone(),
            prefix: env.prefix.clone(),
            value: Vec::new(),
            access_token: "".to_string(),
        })
    }

    async fn duplicate(&self, source_id: &str) -> Result<Environment, String> {
        // Read the source environment.
        let src = sqlx::query("SELECT platform_id, env, label, base_url, prefix FROM environments WHERE id = ?")
            .bind(source_id)
            .fetch_optional(self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Environment not found".to_string())?;

        let platform_id: Option<String> = src.get("platform_id");
        let env: String = src.get("env");
        let source_label: String = src.get("label");
        let base_url: String = src.get("base_url");
        let prefix: String = src.get("prefix");
        let label = format!("{source_label} (копия)");

        let new_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO environments (id, platform_id, env, label, base_url, prefix) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&new_id)
        .bind(&platform_id)
        .bind(&env)
        .bind(&label)
        .bind(&base_url)
        .bind(&prefix)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;

        // Copy variables.
        let var_rows = sqlx::query("SELECT key, value FROM variables WHERE environments_id = ?")
            .bind(source_id)
            .fetch_all(self.db)
            .await
            .map_err(|e| e.to_string())?;

        let mut value = Vec::new();
        for row in var_rows {
            let id = Uuid::new_v4().to_string();
            let name: String = row.get("key");
            let var_value: String = row.get("value");
            sqlx::query(
                "INSERT INTO variables (id, environments_id, key, value) VALUES (?, ?, ?, ?)",
            )
            .bind(&id)
            .bind(&new_id)
            .bind(&name)
            .bind(&var_value)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;
            value.push(EnvValue {
                id,
                name,
                value: var_value,
            });
        }

        // Copy auth config (without the access token — the copy needs its own).
        if let Some(auth) =
            sqlx::query("SELECT url, method, body, token_path FROM environment_auth WHERE environment_id = ?")
                .bind(source_id)
                .fetch_optional(self.db)
                .await
                .map_err(|e| e.to_string())?
        {
            let auth_id = Uuid::new_v4().to_string();
            let url: String = auth.get("url");
            let method: String = auth.get("method");
            let body: String = auth.get("body");
            let token_path: String = auth.get("token_path");
            sqlx::query(
                "INSERT INTO environment_auth (id, environment_id, url, method, body, token_path) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(&auth_id)
            .bind(&new_id)
            .bind(&url)
            .bind(&method)
            .bind(&body)
            .bind(&token_path)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;
        }

        Ok(Environment {
            id: new_id,
            env,
            label,
            base_url,
            prefix,
            value,
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
