use crate::domain::doc_erd::frame::dto::{CreateFrameDTO, FrameBoundsDTO, UpdateFrameDTO};
use crate::domain::doc_erd::frame::entity::Frame;
use crate::domain::doc_erd::frame::repository::FrameRepository;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub struct FrameRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> FrameRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl FrameRepository for FrameRepo<'_> {
    /// Области диаграммы в порядке создания: в этом же порядке холст их и
    /// рисует, так что перекрытие двух областей на экране не меняется от
    /// открытия к открытию.
    async fn all_by_erd(&self, doc_erd_id: &str) -> Result<Vec<Frame>, String> {
        let rows = sqlx::query(
            "SELECT id, title, x, y, w, h FROM erd_frame WHERE doc_erd_id = ? ORDER BY rowid",
        )
        .bind(doc_erd_id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| Frame {
                id: r.get("id"),
                title: r.get("title"),
                x: r.get("x"),
                y: r.get("y"),
                w: r.get("w"),
                h: r.get("h"),
            })
            .collect())
    }

    async fn create_for_erd(
        &self,
        doc_erd_id: &str,
        frame: &CreateFrameDTO,
    ) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query(
            "INSERT INTO erd_frame (id, doc_erd_id, title, x, y, w, h) \
             VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(doc_erd_id)
        .bind(&frame.title)
        .bind(frame.x)
        .bind(frame.y)
        .bind(frame.w)
        .bind(frame.h)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(id)
    }

    async fn update(&self, frame: &UpdateFrameDTO) -> Result<(), String> {
        sqlx::query("UPDATE erd_frame SET title = ? WHERE id = ?")
            .bind(&frame.title)
            .bind(&frame.id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn update_bounds(&self, bounds: &[FrameBoundsDTO]) -> Result<(), String> {
        if bounds.is_empty() {
            return Ok(());
        }

        let mut tx = self.db.begin().await.map_err(|e| e.to_string())?;

        for b in bounds {
            sqlx::query("UPDATE erd_frame SET x = ?, y = ?, w = ?, h = ? WHERE id = ?")
                .bind(b.x)
                .bind(b.y)
                .bind(b.w)
                .bind(b.h)
                .bind(&b.id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }

        tx.commit().await.map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Удаляет только саму область: таблицы, которые в ней лежали, остаются на
    /// месте — членство в области геометрическое, и убирать за ней нечего.
    async fn delete(&self, frame_id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM erd_frame WHERE id = ?")
            .bind(frame_id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::sqlite::test_db;

    /// Платформа с ERD-узлом, к которому цепляются области.
    async fn db() -> SqlitePool {
        let pool = test_db::migrated().await;
        sqlx::query("INSERT INTO platforms (id, name) VALUES ('p1', 'P')")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO catalog_node (id, platform_id, parent_id, kind, name) \
             VALUES ('erd1', 'p1', NULL, 'doc_erd', 'Схема')",
        )
        .execute(&pool)
        .await
        .unwrap();
        sqlx::query("INSERT INTO doc_erd (id) VALUES ('erd1')")
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    fn rect(title: &str) -> CreateFrameDTO {
        CreateFrameDTO {
            title: title.to_string(),
            x: 100.0,
            y: 100.0,
            w: 400.0,
            h: 300.0,
        }
    }

    /// Границы правит холст, подпись — форма. Пачка границ не должна затирать
    /// подпись, которую в это же время меняли в другом месте.
    #[tokio::test]
    async fn saving_bounds_leaves_the_title_alone() {
        let pool = db().await;
        let repo = FrameRepo::new(&pool);
        let id = repo.create_for_erd("erd1", &rect("Биллинг")).await.unwrap();

        repo.update_bounds(&[FrameBoundsDTO {
            id: id.clone(),
            x: 40.0,
            y: 60.0,
            w: 500.0,
            h: 200.0,
        }])
        .await
        .unwrap();

        let frames = repo.all_by_erd("erd1").await.unwrap();
        assert_eq!(frames.len(), 1);
        assert_eq!(
            (frames[0].x, frames[0].y, frames[0].w, frames[0].h),
            (40.0, 60.0, 500.0, 200.0)
        );
        assert_eq!(frames[0].title, "Биллинг");
    }

    /// Область живёт только внутри своей диаграммы: с её удалением уходит и она.
    #[tokio::test]
    async fn deleting_a_diagram_takes_its_frames_with_it() {
        let pool = db().await;
        FrameRepo::new(&pool)
            .create_for_erd("erd1", &rect("Биллинг"))
            .await
            .unwrap();

        sqlx::query("DELETE FROM catalog_node WHERE id = 'erd1'")
            .execute(&pool)
            .await
            .unwrap();

        let left: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM erd_frame")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(left, 0);
    }
}
