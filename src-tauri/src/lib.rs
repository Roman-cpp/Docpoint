mod state;
mod http;
mod doca;
mod endpoint;
mod entity;
mod env_config;

#[tauri::command]
async fn save_json_file(content: String, filename: String) -> Result<bool, String> {
    let path = tokio::task::spawn_blocking(move || {
        rfd::FileDialog::new()
            .set_file_name(&filename)
            .add_filter("JSON", &["json"])
            .save_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    match path {
        Some(p) => {
            std::fs::write(&p, content).map_err(|e| e.to_string())?;
            Ok(true)
        }
        None => Ok(false),
    }
}

use state::AppState;
use http::send_request;
use doca::{db_list_doca_ids, db_read_doca, db_read_docs, db_write_doca, db_delete_doca};
use endpoint::{db_read_groups, db_write_groups};
use entity::{db_read_schemas, db_write_schemas};
use env_config::{db_read_env_configs, db_write_env_configs};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_dir)?;

            let db_path = app_dir.join("docpoint.db");
            let options = SqliteConnectOptions::new()
                .filename(&db_path)
                .create_if_missing(true);

            let pool = tauri::async_runtime::block_on(async {
                SqlitePool::connect_with(options).await
            })?;

            tauri::async_runtime::block_on(async {
                sqlx::migrate!("./migrations").run(&pool).await
            })?;

            app.manage(AppState { db: pool });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_json_file,
            send_request,
            db_read_docs,
            db_list_doca_ids,
            db_read_doca,
            db_write_doca,
            db_delete_doca,
            db_read_groups,
            db_write_groups,
            db_read_schemas,
            db_write_schemas,
            db_read_env_configs,
            db_write_env_configs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
