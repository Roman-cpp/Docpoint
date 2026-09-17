mod commands;
mod domain;
mod infrastructure;
mod logging;
mod repository;
mod service;
mod state;
mod webkit;

use commands::{
    authenticate_environment, clear_environment_session, create_endpoint, create_endpoint_request,
    create_environment, create_erd_schema, create_node, create_platform, create_relation,
    create_variable, create_websocket_message, db_introspect, db_list_schemas, delete_endpoint,
    delete_endpoint_request, delete_environment, delete_group, delete_node, delete_platform,
    delete_relation, delete_schema, delete_variable, delete_websocket_message,
    duplicate_environment, environments_by_platform, export_markdown, export_platform, import_doc,
    import_erd, import_platform, import_websocket, list_endpoint_requests, move_node,
    open_file_node, pick_db_file, read_catalog_tree, read_doc, read_docs, read_environment_auth,
    read_environment_proxy, read_environments_by_doc, read_erd_schemas, read_groups, read_markdown,
    read_node, read_platform, read_platforms, read_relations, read_websocket,
    read_websocket_messages, read_websockets, rename_node, save_endpoint_request, save_json_file,
    send_request, set_environment_access_token, set_selected_environment, update_doc,
    update_endpoint, update_environment, update_environment_auth, update_environment_proxy,
    update_markdown, update_param_value, update_platform, update_schema, update_schema_positions,
    update_variable, update_websocket, update_websocket_message, ws_connect, ws_disconnect,
    ws_send,
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

    // Строго до Tauri: WebKit читает переменные окружения, когда поднимает
    // webview, и позже переключить рендерер уже нельзя.
    let dmabuf_disabled = webkit::disable_dmabuf_renderer_if_needed();

    tauri::Builder::default()
        .plugin(logging::plugin())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            logging::install_panic_hook();

            // Первая запись сессии — то, с чего начинается разбор любого
            // сообщения об ошибке: версия, ОС и где лежат данные.
            let info = app.package_info();
            log::info!(
                "{} {} запускается на {} {}",
                info.name,
                info.version,
                std::env::consts::OS,
                std::env::consts::ARCH
            );
            if let Ok(log_dir) = app.path().app_log_dir() {
                log::info!("логи: {}", log_dir.display());
            }
            if dmabuf_disabled {
                log::info!("драйвер NVIDIA: DMABUF-рендерер WebKit отключён");
            }

            let app_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_dir)?;
            log::info!("данные: {}", app_dir.display());

            // Строго до create_dir_all для content/ и files/ ниже: перенос
            // пропускает то, что уже есть на новом месте, а пустые каталоги
            // выглядели бы как «уже перенесено».
            migrate_legacy_data_dir(&app_dir);

            // Тела документов: имя и место задаёт дерево в БД, здесь лежит
            // только текст, файлом на узел.
            let content_dir = app_dir.join("content");
            std::fs::create_dir_all(&content_dir)?;

            // Загруженные файлы: каталог на узел, внутри — файл под своим
            // именем. Лежат отдельно от тел документов, потому что имя и
            // расширение здесь значащие — по ним файл открывает система.
            let files_dir = app_dir.join("files");
            std::fs::create_dir_all(&files_dir)?;

            let db_path = app_dir.join("docpoint.db");
            let options = SqliteConnectOptions::new()
                .filename(&db_path)
                .create_if_missing(true);

            let pool =
                tauri::async_runtime::block_on(async { SqlitePool::connect_with(options).await })
                    .inspect_err(|e| {
                    log::error!("не удалось открыть базу {}: {e}", db_path.display())
                })?;

            tauri::async_runtime::block_on(async {
                sqlx::migrate!("./migrations").run(&pool).await
            })
            .inspect_err(|e| log::error!("миграции не применились: {e}"))?;
            log::info!("миграции применены");

            app.manage(AppState {
                db: pool,
                selected_environment_id: Default::default(),
                content_dir,
                files_dir,
                ws_conns: Default::default(),
                http_clients: infrastructure::http_client::ClientPool::new(),
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
            update_doc,
            import_doc,
            read_groups,
            create_endpoint,
            update_endpoint,
            delete_endpoint,
            delete_group,
            update_param_value,
            list_endpoint_requests,
            create_endpoint_request,
            delete_endpoint_request,
            save_endpoint_request,
            update_schema,
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
            read_environment_proxy,
            update_environment_proxy,
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
            export_platform,
            import_platform,
            read_erd_schemas,
            create_erd_schema,
            read_relations,
            create_relation,
            delete_relation,
            update_schema_positions,
            import_erd,
            import_websocket,
            db_list_schemas,
            db_introspect,
            pick_db_file,
            open_file_node,
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

/// Одноразовый переезд данных со старого идентификатора приложения.
///
/// До открытия исходников приложение ставилось как `com.roman.docpoint`.
/// Идентификатор занимал namespace чужого домена `roman.com`, поэтому перед
/// публикацией сменён на `io.github.roman-cpp.docpoint`. Каталог данных Tauri
/// выводит из идентификатора, так что у тех, кто ставил раннюю сборку, база и
/// документы остались по старому пути.
///
/// Переносятся только собственные данные приложения. Кеши webview
/// (`CacheStorage`, `localstorage`, `hsts-storage.sqlite`) остаются на старом
/// месте: они одноразовые, а на новом уже могли появиться свои — webview
/// поднимается раньше этого хука.
///
/// Удалить вместе с вызовом после 1.0, когда ранних сборок не останется.
fn migrate_legacy_data_dir(app_dir: &std::path::Path) {
    const LEGACY_ID: &str = "com.roman.docpoint";

    let legacy_dir = app_dir.with_file_name(LEGACY_ID);
    // Готовая база на новом месте означает, что переезд уже был: второй раз
    // заходить нельзя, иначе свежие данные затрутся старыми.
    if !legacy_dir.is_dir() || app_dir.join("docpoint.db").exists() {
        return;
    }

    for name in ["docpoint.db", "content", "files"] {
        let from = legacy_dir.join(name);
        let to = app_dir.join(name);
        if !from.exists() || to.exists() {
            continue;
        }
        match std::fs::rename(&from, &to) {
            Ok(()) => log::info!("перенесено из {LEGACY_ID}: {name}"),
            // Запуск не валим: старый каталог на месте, данные не потеряны,
            // перенос можно повторить руками по пути из лога.
            Err(e) => log::error!(
                "не удалось перенести {} в {}: {e}",
                from.display(),
                to.display()
            ),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::migrate_legacy_data_dir;
    use std::fs;
    use std::path::{Path, PathBuf};

    /// Раскладывает каталоги так, как их видит Tauri: старый и новый лежат
    /// соседями в одном родителе, имя каталога — идентификатор приложения.
    fn data_dirs() -> (tempfile::TempDir, PathBuf, PathBuf) {
        let root = tempfile::tempdir().unwrap();
        let legacy = root.path().join("com.roman.docpoint");
        let current = root.path().join("io.github.roman-cpp.docpoint");
        fs::create_dir_all(&current).unwrap();
        (root, legacy, current)
    }

    fn legacy_install(legacy: &Path) {
        fs::create_dir_all(legacy.join("content")).unwrap();
        fs::create_dir_all(legacy.join("files")).unwrap();
        fs::write(legacy.join("docpoint.db"), b"old-db").unwrap();
        fs::write(legacy.join("content").join("doc.md"), b"telo").unwrap();
    }

    #[test]
    fn a_legacy_install_brings_its_database_and_documents_along() {
        let (_root, legacy, current) = data_dirs();
        legacy_install(&legacy);

        migrate_legacy_data_dir(&current);

        assert_eq!(fs::read(current.join("docpoint.db")).unwrap(), b"old-db");
        assert_eq!(
            fs::read(current.join("content").join("doc.md")).unwrap(),
            b"telo"
        );
        assert!(current.join("files").is_dir());
        assert!(!legacy.join("docpoint.db").exists(), "старое не осталось");
    }

    /// Кеши webview одноразовые и на новом месте уже могли появиться свои —
    /// webview поднимается раньше переезда.
    #[test]
    fn webview_caches_stay_where_they_were() {
        let (_root, legacy, current) = data_dirs();
        legacy_install(&legacy);
        fs::write(legacy.join("hsts-storage.sqlite"), b"cache").unwrap();

        migrate_legacy_data_dir(&current);

        assert!(legacy.join("hsts-storage.sqlite").is_file());
        assert!(!current.join("hsts-storage.sqlite").exists());
    }

    /// Второй запуск не должен затирать свежую работу пользователя старой
    /// базой — иначе переезд превращается в потерю данных.
    #[test]
    fn a_second_launch_leaves_the_current_data_alone() {
        let (_root, legacy, current) = data_dirs();
        legacy_install(&legacy);
        fs::write(current.join("docpoint.db"), b"new-db").unwrap();

        migrate_legacy_data_dir(&current);

        assert_eq!(fs::read(current.join("docpoint.db")).unwrap(), b"new-db");
        assert!(legacy.join("docpoint.db").is_file(), "старое не тронуто");
    }

    #[test]
    fn a_clean_machine_has_nothing_to_migrate() {
        let (_root, _legacy, current) = data_dirs();

        migrate_legacy_data_dir(&current);

        assert!(!current.join("docpoint.db").exists());
    }
}
