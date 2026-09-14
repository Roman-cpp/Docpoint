use super::entity::DbSchema;

/// Источник схемы — единственное, что нужно реализовать новому виду базы.
///
/// Реляционные адаптеры читают системный каталог; будущему Mongo придётся
/// выводить поля из выборки документов, но наружу он отдаст тот же `DbSchema`,
/// и ни превращение в диаграмму, ни команды об этом не узнают.
pub trait SchemaSource {
    /// Схемы (PostgreSQL) или базы (MySQL), видимые этим пользователем.
    async fn schemas(&mut self) -> Result<Vec<String>, String>;

    /// Снимок одной схемы. Данные таблиц не читаются — только каталог.
    async fn introspect(&mut self, schema: &str) -> Result<DbSchema, String>;
}
