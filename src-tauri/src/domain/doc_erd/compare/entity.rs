use serde::Serialize;

use crate::domain::db_import::schema::dto::DbNoticeDTO;
use crate::domain::doc_erd::entity::entity::EntityField;

/// Откуда таблица, колонка или связь известна — и совпало ли описание.
///
/// `Differs` относится только к тому, что есть с обеих сторон: у таблицы это
/// значит «какая-то из колонок разошлась», у колонки — «разошлись флаги».
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DiffStatus {
    /// Есть и в документе, и в базе, описание сходится.
    Same,
    /// Описано на диаграмме, но в базе не найдено.
    OnlyInDoc,
    /// Есть в базе, но на диаграмме не описано.
    OnlyInDb,
    /// Есть с обеих сторон, но описания расходятся.
    Differs,
}

/// Что именно разошлось у колонки, которая есть с обеих сторон.
///
/// Типа здесь нет намеренно: в документе тип — свободная строка (`string`,
/// `uuid`), а база отдаёт родное имя (`varchar(255)`, `int4`). Сравнение их в
/// лоб пометило бы расхождением почти каждое поле, и подсветка перестала бы
/// что-либо значить. Оба типа приезжают в `docType`/`dbType` — их видно рядом
/// в панели, а решение принимает человек.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Mismatch {
    /// Обязательность колонки: `NOT NULL` против `NULL`.
    Nullable,
    /// Участие в первичном ключе.
    Pk,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnDiff {
    pub name: String,
    pub status: DiffStatus,
    /// Тип из документа; `None` — колонки в документе нет.
    pub doc_type: Option<String>,
    /// Тип из базы; `None` — колонки в базе нет.
    pub db_type: Option<String>,
    pub mismatch: Vec<Mismatch>,
    /// Флаги для отрисовки строки: из базы, если она колонку знает, иначе из
    /// документа. Холст рисует объединение, и иконка нужна каждой строке.
    pub pk: bool,
    pub nullable: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableDiff {
    /// Id сущности на диаграмме; `None` — таблица есть только в базе, и на
    /// холсте её рисуют «призраком», которого нельзя ни двигать насовсем, ни
    /// связывать: сохранять такую связь некуда.
    pub id: Option<String>,
    pub name: String,
    pub status: DiffStatus,
    /// Место призрака, посчитанное раскладкой; у таблицы с диаграммы — `None`,
    /// её положение уже сохранено.
    pub x: Option<f64>,
    pub y: Option<f64>,
    /// Колонки объединением: сначала описанные в документе, в его порядке,
    /// затем те, что есть только в базе.
    pub columns: Vec<ColumnDiff>,
    /// Поля таблицы, как их видит база. Заполнены только у тех таблиц, которых
    /// на диаграмме нет: по ним панель переносит таблицу в документ, не ходя в
    /// базу второй раз. У остальных пусто — их поля уже лежат в документе.
    pub fields: Vec<EntityField>,
}

/// Связь, адресованная именами: и документ, и база описывают её концами
/// «таблица + колонка».
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationDiff {
    pub status: DiffStatus,
    pub from_table: String,
    pub from_column: String,
    pub to_table: String,
    pub to_column: String,
}

/// Счётчики для панели: по ним видно объём расхождений, не разглядывая холст.
#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffSummary {
    pub tables_only_in_doc: usize,
    pub tables_only_in_db: usize,
    pub tables_differ: usize,
    pub columns_only_in_doc: usize,
    pub columns_only_in_db: usize,
    pub columns_differ: usize,
    pub relations_only_in_doc: usize,
    pub relations_only_in_db: usize,
}

/// Диаграмма и схема базы, сведённые в одну картину.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErdDiff {
    /// Схема базы, с которой сравнивали.
    pub schema: String,
    pub tables: Vec<TableDiff>,
    pub relations: Vec<RelationDiff>,
    /// То же, что показывает предпросмотр импорта: что интроспекция выбросила
    /// и почему. Расхождение может объясняться именно этим.
    pub notices: Vec<DbNoticeDTO>,
    pub summary: DiffSummary,
}
