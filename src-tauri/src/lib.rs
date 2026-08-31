mod domain;
mod infrastructure;
mod repository;
mod service;
mod state;

use service::{
    authenticate_environment, clear_environment_session, create_endpoint, create_endpoint_request,
    create_environment, create_erd_schema, create_node, create_platform, create_relation,
    create_schema, create_variable, create_websocket_message, delete_endpoint,
    delete_endpoint_request, delete_environment, delete_group, delete_node, delete_platform,
    delete_relation, delete_schema, delete_variable, delete_websocket_message,
    duplicate_environment, environments_by_platform, export_markdown, import_doc,
    list_endpoint_requests, move_node, read_catalog_tree, read_doc, read_doc_content, read_docs,
    read_environment_auth, read_environments_by_doc, read_erd_schemas, read_groups, read_markdown,
    read_node, read_platform, read_platforms, read_relations, read_schemas, read_websocket,
    read_websocket_messages, read_websockets, rename_node, save_endpoint_request, save_json_file,
    send_request, set_environment_access_token, set_selected_environment, update_doc,
    update_endpoint, update_environment, update_environment_auth, update_markdown,
    update_param_value, update_platform, update_schema, update_schema_positions, update_variable,
    update_websocket, update_websocket_message, write_doc_content, write_groups, write_schemas,
    ws_connect, ws_disconnect, ws_send,
};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use state::AppState;
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

            // Тела документов: имя и место задаёт дерево в БД, здесь лежит
            // только текст, файлом на узел.
            let content_dir = app_dir.join("content");
            std::fs::create_dir_all(&content_dir)?;

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
                content_dir,
                ws_conns: Default::default(),
                http_client: infrastructure::http_client::build_client(),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_json_file,
            send_request,
            export_markdown,
            read_catalog_tree,
            read_node,
            create_node,
            rename_node,
            move_node,
            delete_node,
            read_markdown,
            update_markdown,
            read_docs,
            read_doc,
            read_doc_content,
            write_doc_content,
            update_doc,
            import_doc,
            read_groups,
            write_groups,
            create_endpoint,
            update_endpoint,
            delete_endpoint,
            delete_group,
            update_param_value,
            list_endpoint_requests,
            create_endpoint_request,
            delete_endpoint_request,
            save_endpoint_request,
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
            authenticate_environment,
            clear_environment_session,
            set_selected_environment,
            read_platforms,
            read_platform,
            create_platform,
            update_platform,
            delete_platform,
            environments_by_platform,
            read_erd_schemas,
            create_erd_schema,
            read_relations,
            create_relation,
            delete_relation,
            update_schema_positions,
            ws_connect,
            ws_send,
            ws_disconnect,
            read_websockets,
            read_websocket,
            update_websocket,
            read_websocket_messages,
            create_websocket_message,
            update_websocket_message,
            delete_websocket_message,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
