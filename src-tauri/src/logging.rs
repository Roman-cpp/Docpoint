//! Логи приложения: один файл в каталоге логов ОС, куда пишут и Rust, и
//! webview. Сервера у приложения нет, поэтому файл — единственное, что
//! пользователь может прислать вместе с сообщением об ошибке.

use log::LevelFilter;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

/// Имя файла в каталоге логов, без расширения — его добавляет плагин.
const FILE_NAME: &str = "docpoint";
/// После этого размера файл ротируется, чтобы за месяц не вырасти в гигабайт.
const MAX_FILE_SIZE: u128 = 5 * 1024 * 1024;

/// Плагин с целями вывода: stdout для терминала, файл для пользователя,
/// webview для devtools. Библиотечные крейты приглушены до предупреждений —
/// иначе sqlx и hyper запишут каждый запрос.
pub fn plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let level = if cfg!(debug_assertions) {
        LevelFilter::Debug
    } else {
        LevelFilter::Info
    };

    tauri_plugin_log::Builder::new()
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir {
                file_name: Some(FILE_NAME.into()),
            }),
            Target::new(TargetKind::Webview),
        ])
        .level(level)
        .level_for("sqlx", LevelFilter::Warn)
        .level_for("hyper", LevelFilter::Warn)
        .level_for("hyper_util", LevelFilter::Warn)
        .level_for("reqwest", LevelFilter::Warn)
        .level_for("rustls", LevelFilter::Warn)
        .level_for("tungstenite", LevelFilter::Warn)
        .level_for("tao", LevelFilter::Warn)
        .rotation_strategy(RotationStrategy::KeepAll)
        .max_file_size(MAX_FILE_SIZE)
        .build()
}

/// Паника уходит в файл, а не только в stderr, которого у пользователя нет.
/// Стандартный хук остаётся: он печатает в терминал при разработке.
pub fn install_panic_hook() {
    let default = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        log::error!(target: "panic", "{info}");
        default(info);
    }));
}

/// Граница команды: отказ логируется здесь один раз, с именем команды, и
/// уходит на фронт как был. Успех не логируется — команд много, и файл
/// быстро стал бы шумом.
pub fn logged<T>(command: &str, result: Result<T, String>) -> Result<T, String> {
    if let Err(error) = &result {
        log::error!(target: "command", "{command}: {error}");
    }
    result
}
