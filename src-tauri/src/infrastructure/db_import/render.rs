//! Превращение колонки внешней базы в поле ERD-сущности: тип строкой, заметки
//! и значения перечислений. Всё чистое — на этом держатся тесты адаптеров,
//! которые сами по себе только достают строки из каталога.

use crate::domain::db_import::schema::entity::DbColumn;
use crate::domain::doc_erd::entity::entity::{EntityField, EnumValue};

/// Длинные имена типов PostgreSQL в те, которыми их и называют. `format_type`
/// отдаёт `character varying(255)`, а в ячейке таблицы полезнее `varchar(255)`:
/// смысл тот же, а ширины на холсте вдвое меньше.
pub fn pg_short_type(raw: &str) -> String {
    const ALIASES: &[(&str, &str)] = &[
        ("character varying", "varchar"),
        ("timestamp with time zone", "timestamptz"),
        ("timestamp without time zone", "timestamp"),
        ("time with time zone", "timetz"),
        ("time without time zone", "time"),
        ("double precision", "float8"),
        ("boolean", "bool"),
        ("integer", "int4"),
        ("bigint", "int8"),
        ("smallint", "int2"),
    ];

    for (long, short) in ALIASES {
        // Хвост важен: у `character varying(255)` он есть, у `character
        // varying` — нет, а `[]` дописывается к массиву.
        if let Some(rest) = raw.strip_prefix(long) {
            if rest.is_empty() || rest.starts_with('(') || rest.starts_with('[') {
                return format!("{short}{rest}");
            }
        }
    }
    raw.to_string()
}

/// Значения из объявления MySQL: `enum('a','b')` → `["a", "b"]`.
///
/// Больше их взять неоткуда — `information_schema` перечисления отдельно не
/// хранит. Кавычка внутри значения удваивается (`'it''s'`) либо экранируется
/// слэшем, поэтому разбор посимвольный. Всё, что не разобралось, возвращается
/// пустым списком: перечисление — украшение диаграммы, а не повод отказать в
/// импорте таблицы.
pub fn parse_mysql_enum(column_type: &str) -> Vec<String> {
    let lower = column_type.to_ascii_lowercase();
    let open = match lower.find('(') {
        Some(i) if lower.starts_with("enum") || lower.starts_with("set") => i,
        _ => return vec![],
    };
    if !column_type.trim_end().ends_with(')') {
        return vec![];
    }

    let body = &column_type[open + 1..column_type.trim_end().len() - 1];
    let mut values = Vec::new();
    let mut current = String::new();
    let mut inside = false;
    let mut chars = body.chars().peekable();

    while let Some(ch) = chars.next() {
        match ch {
            '\\' if inside => match chars.next() {
                Some(escaped) => current.push(escaped),
                None => return vec![],
            },
            '\'' if inside => {
                if chars.peek() == Some(&'\'') {
                    chars.next();
                    current.push('\'');
                } else {
                    inside = false;
                    values.push(std::mem::take(&mut current));
                }
            }
            '\'' => inside = true,
            _ if inside => current.push(ch),
            // Между значениями бывают только запятая и пробелы.
            ',' | ' ' | '\n' | '\t' => {}
            _ => return vec![],
        }
    }

    if inside {
        return vec![];
    }
    values
}

/// Машинные подробности колонки одной строкой: то, чего не видно по флагам, но
/// что теряется молча, если не записать. Комментарий СУБД сюда не идёт — он
/// живёт в `desc`, чтобы человеческий текст не смешивался с выводом каталога.
pub fn build_note(column: &DbColumn, fk_target: Option<&str>) -> String {
    let mut parts: Vec<String> = Vec::new();

    if let Some(default) = &column.default {
        let value = default.trim();
        if !value.is_empty() {
            parts.push(format!("DEFAULT {value}"));
        }
    }
    if let Some(target) = fk_target {
        parts.push(format!("FK → {target}"));
    }
    if !column.extra.is_empty() {
        parts.push(column.extra.to_uppercase());
    }
    // Значения перечисления дублируются текстом: редактор полей хранит `enum`
    // только у поля с типом `enum`, а мы держим в типе родное имя, поэтому без
    // этой строки первая же ручная правка таблицы стёрла бы значения.
    if !column.enum_values.is_empty() {
        parts.push(format!("Значения: {}", column.enum_values.join(", ")));
    }

    parts.join("; ")
}

/// Колонка внешней базы → поле ERD-сущности.
pub fn to_field(column: &DbColumn, fk_target: Option<&str>) -> EntityField {
    EntityField {
        name: column.name.clone(),
        type_: column.type_name.clone(),
        // `req` — прямое отрицание nullable, а не «обязательно при вставке»:
        // колонка с DEFAULT тоже NOT NULL, и её DEFAULT уходит в заметку.
        req: !column.nullable,
        nullable: column.nullable,
        pk: column.pk,
        desc: column.comment.clone(),
        note: build_note(column, fk_target),
        // Пример значения остался бы чтением чужих данных, а импорт читает
        // только каталог.
        example: String::new(),
        enum_: column
            .enum_values
            .iter()
            .map(|val| EnumValue {
                val: val.clone(),
                desc: String::new(),
            })
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn column(name: &str, type_name: &str) -> DbColumn {
        DbColumn {
            name: name.into(),
            type_name: type_name.into(),
            nullable: false,
            pk: false,
            default: None,
            comment: String::new(),
            enum_values: vec![],
            extra: String::new(),
        }
    }

    #[test]
    fn long_pg_type_names_shorten_but_keep_their_tail() {
        assert_eq!(pg_short_type("character varying(255)"), "varchar(255)");
        assert_eq!(pg_short_type("timestamp with time zone"), "timestamptz");
        assert_eq!(pg_short_type("integer[]"), "int4[]");
    }

    #[test]
    fn unknown_pg_types_pass_through_verbatim() {
        assert_eq!(pg_short_type("numeric(12,2)"), "numeric(12,2)");
        assert_eq!(pg_short_type("jsonb"), "jsonb");
        // Тип пользователя с именем, начинающимся как встроенный, не должен
        // пострадать от сокращения.
        assert_eq!(pg_short_type("integer_range"), "integer_range");
    }

    #[test]
    fn mysql_enum_values_come_from_the_column_type() {
        assert_eq!(parse_mysql_enum("enum('a','b')"), vec!["a", "b"]);
        assert_eq!(parse_mysql_enum("set('x','y')"), vec!["x", "y"]);
        assert_eq!(parse_mysql_enum("enum('a,b','c')"), vec!["a,b", "c"]);
    }

    #[test]
    fn quotes_inside_a_value_survive_both_escapings() {
        assert_eq!(parse_mysql_enum("enum('it''s')"), vec!["it's"]);
        assert_eq!(parse_mysql_enum(r"enum('it\'s')"), vec!["it's"]);
    }

    #[test]
    fn anything_unparseable_is_no_enum_at_all() {
        // Перечисление — украшение диаграммы: непонятное объявление не повод
        // отказать в импорте таблицы.
        assert!(parse_mysql_enum("varchar(255)").is_empty());
        assert!(parse_mysql_enum("enum('unterminated").is_empty());
        assert!(parse_mysql_enum("enum(oops)").is_empty());
    }

    #[test]
    fn note_collects_what_the_flags_do_not_carry() {
        let mut col = column("id", "int");
        col.default = Some("nextval('s')".into());
        col.extra = "auto_increment".into();
        col.enum_values = vec!["a".into(), "b".into()];

        assert_eq!(
            build_note(&col, Some("users.id")),
            "DEFAULT nextval('s'); FK → users.id; AUTO_INCREMENT; Значения: a, b"
        );
    }

    #[test]
    fn a_column_becomes_a_field_without_reading_any_data() {
        let mut col = column("email", "varchar(255)");
        col.comment = "Почта".into();
        let field = to_field(&col, None);

        assert_eq!(field.type_, "varchar(255)");
        assert!(field.req);
        assert!(!field.nullable);
        assert_eq!(field.desc, "Почта");
        // Пример значения — это уже чужие данные, а импорт читает только каталог.
        assert_eq!(field.example, "");
    }
}
