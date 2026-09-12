use crate::domain::environment::environment::dto::{
    CreateEnvironmentDTO, CreateVariableDTO, UpdateEnvironmentDTO, UpdateVariableDTO,
};
use crate::domain::environment::environment::entity::{EnvValue, Environment};
use crate::domain::environment::environment::repository::EnvironmentRepository;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

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
        let src = sqlx::query(
            "SELECT platform_id, env, label, base_url, prefix FROM environments WHERE id = ?",
        )
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
        let var_rows =
            sqlx::query("SELECT key, value, is_secret FROM variables WHERE environments_id = ?")
                .bind(source_id)
                .fetch_all(self.db)
                .await
                .map_err(|e| e.to_string())?;

        let mut value = Vec::new();
        for row in var_rows {
            let id = Uuid::new_v4().to_string();
            let name: String = row.get("key");
            let var_value: String = row.get("value");
            let is_secret: i64 = row.get("is_secret");
            sqlx::query(
                "INSERT INTO variables (id, environments_id, key, value, is_secret) VALUES (?, ?, ?, ?, ?)",
            )
            .bind(&id)
            .bind(&new_id)
            .bind(&name)
            .bind(&var_value)
            .bind(is_secret)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;
            value.push(EnvValue {
                id,
                name,
                value: var_value,
                is_secret: is_secret != 0,
            });
        }

        // Copy auth config (without the access token/session cookies — the copy
        // needs its own session). Раньше сюда попадали не все колонки
        // (`token_placement`, `ws_token_placement` терялись) — теперь копируется
        // весь набор настраиваемых полей.
        if let Some(auth) = sqlx::query(
            "SELECT auth_type, basic_username, basic_password, token_source, credential_name, \
             scheme, url, method, body, body_content_type, extra_headers, token_path, \
             token_placement, ws_token_placement FROM environment_auth WHERE environment_id = ?",
        )
        .bind(source_id)
        .fetch_optional(self.db)
        .await
        .map_err(|e| e.to_string())?
        {
            let auth_id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO environment_auth (id, environment_id, auth_type, basic_username, \
                 basic_password, token_source, credential_name, scheme, url, method, body, \
                 body_content_type, extra_headers, token_path, token_placement, ws_token_placement) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&auth_id)
            .bind(&new_id)
            .bind(auth.get::<String, _>("auth_type"))
            .bind(auth.get::<String, _>("basic_username"))
            .bind(auth.get::<String, _>("basic_password"))
            .bind(auth.get::<String, _>("token_source"))
            .bind(auth.get::<String, _>("credential_name"))
            .bind(auth.get::<String, _>("scheme"))
            .bind(auth.get::<String, _>("url"))
            .bind(auth.get::<String, _>("method"))
            .bind(auth.get::<String, _>("body"))
            .bind(auth.get::<String, _>("body_content_type"))
            .bind(auth.get::<String, _>("extra_headers"))
            .bind(auth.get::<String, _>("token_path"))
            .bind(auth.get::<String, _>("token_placement"))
            .bind(auth.get::<String, _>("ws_token_placement"))
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;
        }

        // Прокси копируется вместе с окружением: копию заводят, чтобы ходить в
        // тот же периметр другим набором данных, и без прокси она бы туда не
        // достучалась.
        if let Some(proxy) = sqlx::query(
            "SELECT enabled, url, username, password, bypass, insecure, timeout_ms FROM environment_proxy WHERE environment_id = ?",
        )
        .bind(source_id)
        .fetch_optional(self.db)
        .await
        .map_err(|e| e.to_string())?
        {
            let proxy_id = Uuid::new_v4().to_string();
            let enabled: i64 = proxy.get("enabled");
            let url: String = proxy.get("url");
            let username: String = proxy.get("username");
            let password: String = proxy.get("password");
            let bypass: String = proxy.get("bypass");
            let insecure: i64 = proxy.get("insecure");
            let timeout_ms: i64 = proxy.get("timeout_ms");
            sqlx::query(
                "INSERT INTO environment_proxy (id, environment_id, enabled, url, username, password, bypass, insecure, timeout_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&proxy_id)
            .bind(&new_id)
            .bind(enabled)
            .bind(&url)
            .bind(&username)
            .bind(&password)
            .bind(&bypass)
            .bind(insecure)
            .bind(timeout_ms)
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

        sqlx::query(
            "INSERT INTO variables (id, environments_id, key, value, is_secret) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(environment_id)
        .bind(&variable.name)
        .bind(&variable.value)
        .bind(variable.is_secret as i64)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(EnvValue {
            id,
            name: variable.name.clone(),
            value: variable.value.clone(),
            is_secret: variable.is_secret,
        })
    }

    async fn update_variable(&self, variable: &UpdateVariableDTO) -> Result<(), String> {
        sqlx::query("UPDATE variables SET key = ?, value = ?, is_secret = ? WHERE id = ?")
            .bind(&variable.name)
            .bind(&variable.value)
            .bind(variable.is_secret as i64)
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::environment::environment_auth::dto::UpdateEnvironmentAuthDTO;
    use crate::domain::environment::environment_auth::repository as auth_repository;
    use crate::domain::environment::environment_proxy::dto::UpdateEnvironmentProxyDTO;
    use crate::domain::environment::environment_proxy::repository as proxy_repository;
    use crate::repository::sqlite::test_db;

    /// Раньше `duplicate` копировал только часть колонок auth/proxy —
    /// `token_placement`/`ws_token_placement` терялись молча, а с добавлением
    /// нового типа авторизации потерь стало бы ещё больше. Проверяем, что
    /// копия воспроизводит весь настраиваемый набор один в один (кроме
    /// секретов вроде access_token, у которых копия заводит свою сессию).
    #[tokio::test]
    async fn duplicate_carries_over_variables_auth_and_proxy_settings() {
        let pool = test_db::migrated().await;
        sqlx::query("INSERT INTO platforms (id, name) VALUES ('p1', 'P')")
            .execute(&pool)
            .await
            .unwrap();

        let repo = EnvironmentRepo::new(&pool);
        let source = repo
            .create(
                "p1",
                &CreateEnvironmentDTO {
                    env: "dev".to_string(),
                    label: "Source".to_string(),
                    base_url: "https://api.example.com".to_string(),
                    prefix: "/v1".to_string(),
                },
            )
            .await
            .unwrap();

        repo.create_variable(
            &source.id,
            &CreateVariableDTO {
                name: "TOKEN".to_string(),
                value: "shh".to_string(),
                is_secret: true,
            },
        )
        .await
        .unwrap();

        auth_repository::upsert(
            &pool,
            &UpdateEnvironmentAuthDTO {
                environment_id: source.id.clone(),
                auth_type: "token".to_string(),
                basic_username: String::new(),
                basic_password: String::new(),
                token_source: "login".to_string(),
                credential_name: "X-Api-Key".to_string(),
                scheme: "Token".to_string(),
                url: "https://api.example.com/login".to_string(),
                method: "POST".to_string(),
                body: "grant_type=password".to_string(),
                body_content_type: "form".to_string(),
                extra_headers: [("X-Client-Id".to_string(), "abc".to_string())]
                    .into_iter()
                    .collect(),
                token_path: "data.token".to_string(),
                token_placement: "query".to_string(),
                ws_token_placement: "header".to_string(),
            },
        )
        .await
        .unwrap();

        proxy_repository::upsert(
            &pool,
            &UpdateEnvironmentProxyDTO {
                environment_id: source.id.clone(),
                enabled: true,
                url: "http://127.0.0.1:8080".to_string(),
                username: "u".to_string(),
                password: "p".to_string(),
                bypass: "localhost".to_string(),
                insecure: true,
                timeout_ms: 5000,
            },
        )
        .await
        .unwrap();

        let copy = repo.duplicate(&source.id).await.unwrap();

        assert_eq!(copy.value.len(), 1);
        assert_eq!(copy.value[0].name, "TOKEN");
        assert!(copy.value[0].is_secret);

        let copied_auth = auth_repository::read_by_env_id(&pool, &copy.id)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(copied_auth.credential_name, "X-Api-Key");
        assert_eq!(copied_auth.scheme, "Token");
        assert_eq!(copied_auth.body_content_type, "form");
        assert_eq!(copied_auth.token_placement, "query");
        assert_eq!(copied_auth.ws_token_placement, "header");
        assert_eq!(copied_auth.extra_headers.get("X-Client-Id").unwrap(), "abc");
        // Своя сессия — не копия чужого токена.
        assert_eq!(copied_auth.access_token, None);

        let copied_proxy = proxy_repository::read_by_env_id(&pool, &copy.id)
            .await
            .unwrap()
            .unwrap();
        assert!(copied_proxy.enabled);
        assert!(copied_proxy.insecure);
        assert_eq!(copied_proxy.timeout_ms, 5000);
        assert_eq!(copied_proxy.bypass, "localhost");
    }
}
