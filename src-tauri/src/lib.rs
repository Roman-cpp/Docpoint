mod domain;
mod service;
mod state;

use state::AppState;
use service::{
    attach_doc, create_doc, create_endpoint, create_environment, create_platform, create_variable, delete_doc,
    delete_endpoint, delete_environment, delete_platform, delete_variable, import_doc, read_doc, read_docs,
    environments_by_platform, read_environment_auth, read_environments_by_doc, read_groups,
    read_platform_docs, read_platforms, read_schemas,
    save_json_file, send_request, set_environment_access_token, update_doc, update_environment,
    update_environment_auth, update_param_value, update_platform, update_variable,
    write_environments, write_groups, write_schemas,
};
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
            update_doc,
            delete_doc,
            import_doc,
            read_groups,
            write_groups,
            create_endpoint,
            delete_endpoint,
            update_param_value,
            read_schemas,
            write_schemas,
            read_environments_by_doc,
            write_environments,
            create_environment,
            update_environment,
            delete_environment,
            create_variable,
            update_variable,
            delete_variable,
            read_environment_auth,
            update_environment_auth,
            set_environment_access_token,
            read_platforms,
            create_platform,
            update_platform,
            delete_platform,
            attach_doc,
            read_platform_docs,
            environments_by_platform,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
