//! Базы для тестов репозиториев: схема собирается настоящими миграциями,
//! поэтому тест краснеет и от рассинхрона с ними.

use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Executor, SqlitePool};

async fn empty() -> SqlitePool {
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap()
}

/// Прогоняет миграции по порядку, останавливаясь после `last`. Нужна, чтобы
/// собрать базу в состоянии «до миграции N» и проверить конверсию данных на
/// настоящей схеме, а не на её пересказе.
pub async fn through(last: &str) -> SqlitePool {
    let pool = empty().await;

    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations");
    let mut files: Vec<_> = std::fs::read_dir(&dir)
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().is_some_and(|e| e == "sql"))
        .collect();
    files.sort();

    for file in files {
        let name = file.file_name().unwrap().to_string_lossy().to_string();
        let sql = std::fs::read_to_string(&file).unwrap();
        pool.execute(sqlx::raw_sql(&sql)).await.unwrap();
        if name.starts_with(last) {
            break;
        }
    }
    pool
}

/// Применяет одну миграцию к уже собранной базе.
pub async fn apply(pool: &SqlitePool, file: &str) {
    let sql = std::fs::read_to_string(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("migrations")
            .join(file),
    )
    .unwrap();
    pool.execute(sqlx::raw_sql(&sql)).await.unwrap();
}

/// База со всей схемой.
pub async fn migrated() -> SqlitePool {
    let pool = empty().await;
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    pool
}
