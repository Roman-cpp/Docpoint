mod domain;
mod infrastructure;
mod repository;
mod service;
mod state;

use state::AppState;
use service::{
    attach_doc, create_directory, create_doc, create_endpoint, create_environment, create_platform, create_schema, create_service, create_variable, delete_directory, delete_doc,
    delete_endpoint, delete_environment, duplicate_environment, delete_group, delete_platform, delete_schema, delete_service, delete_variable, get_environment_access_token, import_doc, import_file, read_doc, read_doc_content, read_docs, write_doc_content,
    create_endpoint_request, delete_endpoint_request, list_endpoint_requests, rename_endpoint_request, set_request_param_value,
    environments_by_platform, read_directory, read_environment_auth, read_environments_by_doc, read_groups,
    read_all_services, read_platform, read_platform_docs, read_platform_services, read_platforms, read_schemas, read_service_docs,
    save_json_file, send_request, set_environment_access_token, set_selected_environment, update_doc, update_environment,
    update_environment_auth, update_param_value, update_platform, update_schema, update_service, update_variable,
    write_groups, write_schemas,
    create_markdown, delete_markdown, export_markdown, read_markdown, read_markdowns, update_markdown,
    read_erds, read_service_erds, create_erd, update_erd, delete_erd,
    read_erd_schemas, create_erd_schema,
    read_relations, create_relation, delete_relation,
    ws_connect, ws_send, ws_disconnect,
    read_websockets, read_service_websockets, create_websocket, update_websocket, delete_websocket,
    read_websocket_messages, create_websocket_message, update_websocket_message, delete_websocket_message,
};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Pin the rustls crypto provider explicitly. Today only `ring` is in the
    // tree so it is auto-selected, but the moment a second provider (e.g.
    // aws-lc-rs) is pulled in transitively, rustls 0.23 would panic on the
    // first wss:// handshake with "no process-level CryptoProvider". Installing
    // one up front keeps TLS deterministic regardless of the dependency graph.
    let _ = rustls::crypto::ring::default_provider().install_default();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_dir)?;

            let vault_dir = app_dir.join("vault");
            std::fs::create_dir_all(&vault_dir)?;

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

            app.manage(AppState {
                db: pool,
                selected_environment_id: Default::default(),
                vault_dir,
                ws_conns: Default::default(),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_json_file,
            send_request,
            read_docs,
            read_doc,
            read_doc_content,
            write_doc_content,
            create_doc,
            update_doc,
            delete_doc,
            import_doc,
            import_file,
            read_groups,
            write_groups,
            create_endpoint,
            delete_endpoint,
            delete_group,
            update_param_value,
            list_endpoint_requests,
            create_endpoint_request,
            rename_endpoint_request,
            delete_endpoint_request,
            set_request_param_value,
            read_schemas,
            write_schemas,
            update_schema,
            create_schema,
            delete_schema,
            read_environments_by_doc,
            create_environment,
            update_environment,
            delete_environment,
            duplicate_environment,
            create_variable,
            update_variable,
            delete_variable,
            read_environment_auth,
            update_environment_auth,
            set_environment_access_token,
            get_environment_access_token,
            set_selected_environment,
            read_platforms,
            read_platform,
            create_platform,
            update_platform,
            delete_platform,
            attach_doc,
            read_platform_docs,
            read_platform_services,
            read_all_services,
            read_service_docs,
            create_service,
            update_service,
            delete_service,
            environments_by_platform,
            read_directory,
            create_directory,
            delete_directory,
            read_markdowns,
            read_markdown,
            create_markdown,
            update_markdown,
            delete_markdown,
            export_markdown,
            read_erds,
            read_service_erds,
            create_erd,
            update_erd,
            delete_erd,
            read_erd_schemas,
            create_erd_schema,
            read_relations,
            create_relation,
            delete_relation,
            ws_connect,
            ws_send,
            ws_disconnect,
            read_websockets,
            read_service_websockets,
            create_websocket,
            update_websocket,
            delete_websocket,
            read_websocket_messages,
            create_websocket_message,
            update_websocket_message,
            delete_websocket_message,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
