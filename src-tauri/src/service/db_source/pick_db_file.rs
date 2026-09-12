/// Системный диалог выбора файла базы SQLite. Возвращает путь либо `None`,
/// если выбор отменили.
///
/// Путь нужен именно от бэкенда: у `File` из веб-инпута его нет, а открывать
/// базу по содержимому нельзя — sqlx работает с файлом на диске.
pub async fn pick_db_file() -> Result<Option<String>, String> {
    let path = tokio::task::spawn_blocking(move || {
        rfd::FileDialog::new()
            .add_filter("SQLite", &["db", "sqlite", "sqlite3", "db3"])
            .pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(path.map(|p| p.to_string_lossy().to_string()))
}
