use crate::domain::catalog::dto::CreateNodeDTO;
use crate::domain::doc_erd::entity::dto::EntityPositionDTO;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::domain::doc_erd::entity_relation::dto::RelationEndpointsDTO;
use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use crate::domain::doc_erd::import::dto::{ImportRelationDTO, ImportTableDTO};
use crate::repository::sqlite::entity::EntityRepo;
use crate::repository::sqlite::entity_relation::RelationRepo;
use crate::service::catalog::create_tree_node;
use crate::state::AppState;
use std::collections::HashMap;
use tauri::State;

/// Импорт ERD из файла: тот же путь создания узла, что и у ручного, плюс
/// таблицы и связи из файла.
///
/// Собран одной командой ради id сущностей: в файле их нет, а связи адресуют
/// таблицы именами. Id выдаёт база при вставке, и сопоставление «имя → id»
/// живёт здесь же — вызывающей стороне не приходится вести его самой и
/// ходить за каждой таблицей отдельно.
///
/// Место в дереве задаёт вызывающая сторона — импорт кладёт диаграмму туда,
/// где открыт проводник.
#[tauri::command]
pub async fn import_erd(
    state: State<'_, AppState>,
    node: CreateNodeDTO,
    tables: Vec<ImportTableDTO>,
    relations: Vec<ImportRelationDTO>,
) -> Result<String, String> {
    crate::logging::logged(
        "import_erd",
        async {
            let created = create_tree_node(&state, &node).await?;

            let entities = EntityRepo::new(&state.db);

            let mut id_of: HashMap<&str, String> = HashMap::new();
            let mut positions: Vec<EntityPositionDTO> = Vec::with_capacity(tables.len());

            for table in &tables {
                let id = entities.create_for_erd(&created.id, &table.schema).await?;
                positions.push(EntityPositionDTO {
                    id: id.clone(),
                    x: table.x,
                    y: table.y,
                });
                id_of.insert(table.schema.name.as_str(), id);
            }

            entities.update_positions(&positions).await?;

            let relation_repo = RelationRepo::new(&state.db);

            for relation in &relations {
                relation_repo
                    .create(&RelationEndpointsDTO {
                        from_entity: entity_id(&id_of, &relation.from_table)?,
                        from_field: relation.from_column.clone(),
                        to_entity: entity_id(&id_of, &relation.to_table)?,
                        to_field: relation.to_column.clone(),
                    })
                    .await?;
            }

            Ok(created.id)
        }
        .await,
    )
}

/// Id таблицы, созданной этим же импортом. Имени, которого нет среди таблиц
/// файла, соответствовать нечему — связь повисла бы в воздухе.
fn entity_id(id_of: &HashMap<&str, String>, table: &str) -> Result<String, String> {
    id_of
        .get(table)
        .cloned()
        .ok_or_else(|| format!("Импорт ERD: в файле нет таблицы «{table}»"))
}
