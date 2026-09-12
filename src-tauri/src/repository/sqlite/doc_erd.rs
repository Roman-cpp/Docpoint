use crate::domain::doc_erd::doc_erd::repository::DocErdRepository;
use sqlx::SqlitePool;

pub struct DocErdRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> DocErdRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl DocErdRepository for DocErdRepo<'_> {
    async fn create(&self, id: &str) -> Result<(), String> {
        sqlx::query("INSERT INTO doc_erd (id) VALUES (?)")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
