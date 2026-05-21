mod state;
mod http;
mod doc;
mod endpoint;
mod group;
mod entity;
mod environment;

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
use doc::{read_docs, read_doc, create_doc, delete_doc, import_doc};
use endpoint::update_param_value;
use group::{read_groups, write_groups};
use entity::{read_schemas, write_schemas};
use environment::{read_environments, write_environments, create_environment, update_environment, delete_environment, create_variable, update_variable, delete_variable};
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
            read_docs,
            read_doc,
            create_doc,
            delete_doc,
            import_doc,
            read_groups,
            write_groups,
            update_param_value,
            read_schemas,
            write_schemas,
            read_environments,
            write_environments,
            create_environment,
            update_environment,
            delete_environment,
            create_variable,
            update_variable,
            delete_variable,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
