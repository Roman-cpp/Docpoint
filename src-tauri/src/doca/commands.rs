use crate::state::AppState;
use super::model::Doca;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn db_read_docs(state: State<'_, AppState>) -> Result<Vec<Doca>, String> {
    let rows = sqlx::query("SELECT * FROM doca")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if rows.is_empty() {
        return Ok(vec![]);
    }

    let ids: Vec<String> = rows.iter().map(|r| r.get("id")).collect();

    let mut tq = sqlx::QueryBuilder::new("SELECT * FROM doca_tag WHERE doca_id IN (");
    let mut sep = tq.separated(",");
    for id in &ids {
        sep.push_bind(id);
    }
    tq.push(")");

    let tag_rows = tq
        .build()
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows
        .iter()
        .map(|r| {
            let id: String = r.get("id");
            let tags: Vec<String> = tag_rows
                .iter()
                .filter(|t| t.get::<String, _>("doca_id") == id)
                .map(|t| t.get("tag"))
                .collect();
            Doca {
                id,
                name: r.get("name"),
                version: r.get("version"),
                desc: r.get("desc"),
                tags,
            }
        })
        .collect())
}

#[tauri::command]
pub async fn db_list_doca_ids(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let rows = sqlx::query("SELECT id FROM doca")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|r| r.get::<String, _>("id")).collect())
}

#[tauri::command]
pub async fn db_read_doca(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Doca>, String> {
    let row = sqlx::query("SELECT * FROM doca WHERE id = ?")
        .bind(&id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let Some(row) = row else {
        return Ok(None);
    };

    let tag_rows = sqlx::query("SELECT tag FROM doca_tag WHERE doca_id = ?")
        .bind(&id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Some(Doca {
        id: row.get("id"),
        name: row.get("name"),
        version: row.get("version"),
        desc: row.get("desc"),
        tags: tag_rows.iter().map(|r| r.get::<String, _>("tag")).collect(),
    }))
}

#[tauri::command]
pub async fn db_write_doca(
    state: State<'_, AppState>,
    doca: Doca,
) -> Result<(), String> {
    sqlx::query("INSERT OR REPLACE INTO doca (id, name, version, desc) VALUES (?, ?, ?, ?)")
        .bind(&doca.id)
        .bind(&doca.name)
        .bind(&doca.version)
        .bind(&doca.desc)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM doca_tag WHERE doca_id = ?")
        .bind(&doca.id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    for tag in &doca.tags {
        sqlx::query("INSERT INTO doca_tag (doca_id, tag) VALUES (?, ?)")
            .bind(&doca.id)
            .bind(tag)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn db_delete_doca(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let mut conn = state.db.acquire().await.map_err(|e| e.to_string())?;

    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM doca WHERE id = ?")
        .bind(&id)
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
