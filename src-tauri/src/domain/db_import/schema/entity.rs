/// Снимок схемы внешней базы, уже не зависящий от диалекта.
///
/// Адаптеры (`infrastructure/db_import/*`) отличаются только запросами: всё,
/// что они вернули, дальше идёт через эти типы, поэтому и превращение в
/// ERD-диаграмму, и его тесты написаны один раз на все СУБД.
#[derive(Debug, Default)]
pub struct DbSchema {
    pub name: String,
    pub tables: Vec<DbTable>,
}

#[derive(Debug)]
pub struct DbTable {
    pub name: String,
    /// Комментарий таблицы, если СУБД его хранит; иначе пусто.
    pub comment: String,
    pub columns: Vec<DbColumn>,
    pub foreign_keys: Vec<DbForeignKey>,
}

#[derive(Debug)]
pub struct DbColumn {
    pub name: String,
    /// Тип в родном написании (`varchar(255)`, `numeric(12,2)`, `timestamptz`).
    pub type_name: String,
    pub nullable: bool,
    pub pk: bool,
    pub default: Option<String>,
    pub comment: String,
    /// Значения перечисления, если тип колонки — перечисление.
    pub enum_values: Vec<String>,
    /// Пометки СУБД, которые стоит показать: `AUTO_INCREMENT` и подобные.
    pub extra: String,
}

/// Внешний ключ целиком, включая составной: колонки идут парами по позиции.
#[derive(Debug)]
pub struct DbForeignKey {
    pub columns: Vec<String>,
    pub ref_table: String,
    pub ref_columns: Vec<String>,
}
