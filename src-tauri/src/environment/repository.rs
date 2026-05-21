use super::model::{CreateEnvironment, CreateVariable, EnvValue, Environment, UpdateEnvironment, UpdateVariable};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub async fn read_configs(db: &SqlitePool, doc_id: &str) -> Result<Vec<Environment>, String> {
    let rows = sqlx::query("SELECT * FROM environments WHERE doc_id = ?")
        .bind(doc_id)
        .fetch_all(db)
        .await
        .map_err(|e| e.to_string())?;

    let mut environments = Vec::new();
    for row in rows.iter() {
        let id: String = row.get("id");
        let var_rows =
            sqlx::query("SELECT id, key, value FROM variables WHERE environments_id = ?")
                .bind(&id)
                .fetch_all(db)
                .await
                .map_err(|e| e.to_string())?;

        // let auth = auth_repo::ensure_row(db, &id).await?;

        environments.push(Environment {
            id,
            env: row.get("env"),
            label: row.get("label"),
            base_url: row.get("base_url"),
            prefix: row.get("prefix"),
            value: var_rows
                .iter()
                .map(|v| EnvValue {
                    id: v.get("id"),
                    name: v.get("key"),
                    value: v.get("value"),
                })
                .collect(),
            access_token: "".to_string(),
        });
    }

    Ok(environments)
}

pub async fn write_configs(
    db: &SqlitePool,
    doc_id: &str,
    configs: &[CreateEnvironment],
) -> Result<(), String> {
    for config in configs {
        let env_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO environments (id, doc_id, env, label, base_url, prefix) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&env_id)
        .bind(doc_id)
        .bind(&config.env)
        .bind(&config.label)
        .bind(&config.base_url)
        .bind(&config.prefix)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

        for var in &config.value {
            sqlx::query(
                "INSERT INTO variables (environments_id, key, value) VALUES (?, ?, ?)",
            )
            .bind(&env_id)
            .bind(&var.name)
            .bind(&var.value)
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub async fn create_environment(
    db: &SqlitePool,
    doc_id: &str,
    env: &CreateEnvironment,
) -> Result<Environment, String> {
    let env_id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO environments (id, doc_id, env, label, base_url, prefix) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&env_id)
    .bind(doc_id)
    .bind(&env.env)
    .bind(&env.label)
    .bind(&env.base_url)
    .bind(&env.prefix)
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    let mut values = Vec::new();
    for var in &env.value {
        let var_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO variables (id, environments_id, key, value) VALUES (?, ?, ?, ?)",
        )
        .bind(&var_id)
        .bind(&env_id)
        .bind(&var.name)
        .bind(&var.value)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

        values.push(EnvValue {
            id: var_id,
            name: var.name.clone(),
            value: var.value.clone(),
        });
    }

    // let auth = auth_repo::ensure_row(db, &env_id).await?;

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

pub async fn update_environment(db: &SqlitePool, env: &UpdateEnvironment) -> Result<(), String> {
    sqlx::query("UPDATE environments SET label = ?, base_url = ?, prefix = ? WHERE id = ?")
        .bind(&env.label)
        .bind(&env.base_url)
        .bind(&env.prefix)
        .bind(&env.id)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn create_variable(
    db: &SqlitePool,
    environment_id: &str,
    variable: &CreateVariable,
) -> Result<EnvValue, String> {
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO variables (id, environments_id, key, value) VALUES (?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(environment_id)
    .bind(&variable.name)
    .bind(&variable.value)
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(EnvValue {
        id,
        name: variable.name.clone(),
        value: variable.value.clone(),
    })
}

pub async fn update_variable(db: &SqlitePool, variable: &UpdateVariable) -> Result<(), String> {
    sqlx::query("UPDATE variables SET key = ?, value = ? WHERE id = ?")
        .bind(&variable.name)
        .bind(&variable.value)
        .bind(&variable.id)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn delete_variable(db: &SqlitePool, id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM variables WHERE id = ?")
        .bind(id)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn delete_environment(db: &SqlitePool, id: &str) -> Result<(), String> {
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

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
