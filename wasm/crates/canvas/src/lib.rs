use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use wasm_bindgen::prelude::*;
use web_sys::CanvasRenderingContext2d;

mod domain;

use domain::diff::model::DiffStatus;
use domain::frame::model::{
    Frame, Handle, CORNER_R as FRAME_CORNER_R, MIN_H as FRAME_MIN_H, MIN_W as FRAME_MIN_W,
    TITLE_H as FRAME_TITLE_H,
};
use domain::relation::model::{Endpoint, Relation};
use domain::table::model::{ColKind, Column, Table, HEADER_H, ROW_H};

// ---------------------------------------------------------------------------
// Wire shapes for `Scene::load`. These mirror the JSON the Tauri commands
// `read_schemas` and `read_relations` return (see src-tauri domain models), so
// the JS side can forward the command results verbatim. Only the fields the
// diagram needs are deserialized; unknown keys (desc, note, example, …) are
// ignored.
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EntityDTO {
    id: String,
    name: String,
    #[serde(default)]
    fields: Vec<FieldDTO>,
    /// Сохранённое положение на холсте. `None` — сущность ещё не размещали;
    /// [`Scene::load`] разложит её автолейаутом и вернёт результат на запись.
    #[serde(default)]
    pos_x: Option<f64>,
    #[serde(default)]
    pos_y: Option<f64>,
}

#[derive(Deserialize)]
struct FieldDTO {
    name: String,
    #[serde(default)]
    pk: bool,
    #[serde(default)]
    nullable: bool,
}

/// Shape accepted by [`Scene::add_table`] — the table the creation form on the
/// JS side has just persisted, forwarded verbatim as `CreateEntityDTO`. Keys
/// the diagram does not draw (`desc`, `type`, `req`, …) are ignored.
#[derive(Deserialize)]
struct NewTableDTO {
    /// Id, который вернула команда `create_erd_schema`: без него сцена не
    /// смогла бы ни сохранить позицию таблицы, ни привязать к ней связь.
    id: String,
    name: String,
    #[serde(default)]
    fields: Vec<FieldDTO>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RelationDTO {
    from_entity: String,
    from_field: String,
    to_entity: String,
    to_field: String,
}

/// Область, как её возвращает команда `read_erd_frames` и как её принимает
/// [`Scene::add_frame`]. Состава у области нет — только подпись и геометрия.
#[derive(Deserialize)]
struct FrameDTO {
    id: String,
    #[serde(default)]
    title: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

// ---------------------------------------------------------------------------
// Wire shapes for `Scene::take_pending`. The scene never talks to the backend
// itself: it accumulates what changed and hands the batch to JS, which spends
// it on the `update_schema_positions`, `create_relation` and `delete_relation`
// commands. Field names match those commands' payloads verbatim.
// ---------------------------------------------------------------------------

/// A table's new position, addressed by entity id.
#[derive(Serialize)]
struct TablePosition {
    id: String,
    x: f64,
    y: f64,
}

/// A relation's two ends in database terms. The `entity_relation` table has a
/// UNIQUE over exactly this tuple, so it addresses a relation as well as its id
/// would — and the scene, which knows only entities and fields, never has to
/// carry relation ids around.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RelationEndpoints {
    from_entity: String,
    from_field: String,
    to_entity: String,
    to_field: String,
}

// ---------------------------------------------------------------------------
// Wire shapes for `Scene::set_diff` — ответ команды `compare_erd_with_db`.
// Сцена сравнение не считает: она получает готовое объединение и раскрашивает
// его. Поля, которых на холсте не видно (типы, вид расхождения), не читаются —
// их показывает панель рядом.
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DiffDTO {
    tables: Vec<TableDiffDTO>,
    #[serde(default)]
    relations: Vec<RelationDiffDTO>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableDiffDTO {
    /// Id сущности на диаграмме; `None` — таблица есть только в базе.
    #[serde(default)]
    id: Option<String>,
    name: String,
    status: String,
    #[serde(default)]
    x: Option<f64>,
    #[serde(default)]
    y: Option<f64>,
    columns: Vec<ColumnDiffDTO>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ColumnDiffDTO {
    name: String,
    status: String,
    #[serde(default)]
    pk: bool,
    #[serde(default)]
    nullable: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RelationDiffDTO {
    status: String,
    from_table: String,
    from_column: String,
    to_table: String,
    to_column: String,
}

/// Новые границы области, адресованные её id. Ложатся в ту же пачку, что и
/// позиции таблиц: перетаскивание области двигает и то, и другое разом.
#[derive(Serialize)]
struct FrameBounds {
    id: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

/// Прямоугольник, который пользователь только что протянул по холсту. Id у него
/// ещё нет: сцена отдаёт геометрию, JS заводит область командой и возвращает
/// готовую обратно через [`Scene::add_frame`].
#[derive(Serialize)]
struct FrameRect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

/// Everything the scene has changed since the last flush.
#[derive(Serialize)]
struct Pending {
    moves: Vec<TablePosition>,
    links: Vec<RelationEndpoints>,
    unlinks: Vec<RelationEndpoints>,
    frames: Vec<FrameBounds>,
}

/// Видимая часть мира в мировых координатах. Всё, что сюда не попадает, не
/// рисуется вовсе: на диаграмме из сотни таблиц за экраном обычно почти все.
#[derive(Clone, Copy)]
struct Viewport {
    left: f64,
    top: f64,
    right: f64,
    bottom: f64,
}

impl Viewport {
    /// Пересекается ли с прямоугольником. Поля запаса нет — вызывающая сторона
    /// уже расширила область на толщину теней и рамок.
    fn hits(&self, x: f64, y: f64, w: f64, h: f64) -> bool {
        x + w >= self.left && x <= self.right && y + h >= self.top && y <= self.bottom
    }
}

/// Насколько подробно рисовать таблицу. Ниже половинного масштаба строки
/// колонок нечитаемы, а стоят они дороже всего остального вместе взятого:
/// текст, иконка и смена стиля на каждую строку каждой таблицы.
#[derive(Clone, Copy, PartialEq)]
enum Detail {
    Full,
    Compact,
}

/// Which icon a column gets. Primary keys win, then the foreign-key side of a
/// relation, then nullability. Shared by [`Scene::load`] and
/// [`Scene::add_table`] so a table looks the same however it entered the scene.
fn col_kind(pk: bool, nullable: bool, is_fk: bool) -> ColKind {
    if pk {
        ColKind::Pk
    } else if is_fk {
        ColKind::Fk
    } else if nullable {
        ColKind::Nullable
    } else {
        ColKind::Plain
    }
}

const TAU: f64 = std::f64::consts::PI * 2.0;

// ---------------------------------------------------------------------------
// Rendering layout constants (in world / CSS pixels, before camera scaling).
// The table's intrinsic geometry (HEADER_H, ROW_H) lives in the table model.
// ---------------------------------------------------------------------------
const PAD_X: f64 = 14.0;
const ICON_W: f64 = 20.0;
const TEXT_GAP: f64 = 6.0;
const MIN_TABLE_W: f64 = 170.0;
const CORNER_R: f64 = 8.0;
const PORT_R: f64 = 4.0; // visible connection-port radius
const PORT_HIT: f64 = 8.0; // grab tolerance around a port, in world px
const REL_HIT: f64 = 6.0; // click tolerance around a relation curve, in screen px
const BADGE_R: f64 = 9.0; // delete-badge radius on a selected relation
const FRAME_HIT: f64 = 6.0; // grab tolerance around a frame's border, in screen px
const HANDLE_R: f64 = 4.0; // visible resize-handle half-size, in screen px
const HANDLE_HIT: f64 = 7.0; // grab tolerance around a resize handle, in screen px
/// Меньше этого протянутый прямоугольник считается промахом, а не областью:
/// одиночный клик в режиме рисования ничего не создаёт.
const DRAFT_MIN: f64 = 24.0;
/// Место под знак расхождения у правого края строки.
const SIGN_W: f64 = 14.0;

// Light theme palette — mirrors the app's design tokens (tokens.css):
// warm cream canvas, white surfaces, earthy accents.
const COL_BG: &str = "#faf7f2"; // --bg
const COL_GRID: &str = "#e2dccf"; // subtle warm dot, between --border and --border-h
const COL_TABLE_BG: &str = "#ffffff"; // --surface
const COL_HEADER_BG: &str = "#f0ede8"; // --cat-bg
const COL_BORDER: &str = "#e8e2d9"; // --border
const COL_BORDER_SEL: &str = "#3a5a78"; // --blue
const COL_TEXT: &str = "#1a1a1a"; // --ink
const COL_TEXT_HEAD: &str = "#1a1a1a"; // --ink
const COL_TEXT_DIM: &str = "#888888"; // --ink-low
const COL_KEY: &str = "#3f6b4a"; // --green
const COL_REL: &str = "#c8c0b4"; // --border-h
const COL_REL_SEL: &str = "#3a5a78"; // --blue, selected relation
const COL_DELETE: &str = "#9b3b36"; // --red, delete badge
const COL_SHADOW: &str = "rgba(0, 0, 0, 0.08)"; // --shadow-sm tone
                                                // Область — подложка под таблицами, поэтому заливка полупрозрачная: сквозь неё
                                                // видно сетку, а карточки таблиц поверх остаются белыми и читаемыми.
const COL_FRAME_BG: &str = "rgba(240, 237, 232, 0.55)"; // --cat-bg, приглушённый
const COL_FRAME_BORDER: &str = "#ddd6ca"; // между --border и --border-h
const COL_FRAME_TITLE: &str = "#555555"; // --ink-mid
const COL_HANDLE_BG: &str = "#ffffff"; // --surface, заливка ручки растягивания
                                       // Сравнение с живой базой. Цвет здесь не единственный носитель смысла: у строки
                                       // с расхождением есть ещё и знак справа, а у таблицы, которой нет на диаграмме,
                                       // — пунктирная рамка. Иначе режим был бы бесполезен при дальтонизме и на
                                       // распечатанной схеме.
const COL_DOC_ONLY: &str = "#75591a"; // --amber, описано, но в базе не найдено
const COL_DOC_ONLY_BG: &str = "#f5edd9"; // --amber-bg
const COL_DB_ONLY: &str = "#3f6b4a"; // --green, есть в базе, но не описано
const COL_DB_ONLY_BG: &str = "#eaf0e9"; // --green-bg
const COL_DIFFERS: &str = "#9b3b36"; // --red, описания расходятся
const COL_DIFFERS_BG: &str = "#f4e4e2"; // --red-bg

// Font stacks mirroring --font-serif / --font-mono in tokens.css.
const FONT_HEAD: &str = "600 14px \"Lora\", Georgia, \"Times New Roman\", serif";
const FONT_ROW: &str = "13px \"Menlo\", \"SF Mono\", \"Courier New\", monospace";
const FONT_FRAME: &str = "600 15px \"Lora\", Georgia, \"Times New Roman\", serif";

/// An in-progress table drag: which table and the cursor offset from its
/// top-left corner, in world coordinates.
struct DragState {
    index: usize,
    offset_x: f64,
    offset_y: f64,
    /// Позиция таблицы в момент захвата — с ней сравнивается конечная, чтобы
    /// клик без перетаскивания не порождал запись в БД.
    start_x: f64,
    start_y: f64,
}

/// An in-progress canvas pan: the screen position where the drag began and the
/// camera offset at that moment.
struct PanState {
    start_x: f64,
    start_y: f64,
    cam_x: f64,
    cam_y: f64,
}

/// An in-progress relation drag started from a column port: the source endpoint,
/// which side of the table the port sits on, and the live cursor position in
/// world coordinates (drives the preview curve).
struct LinkState {
    from: Endpoint,
    from_right: bool,
    cursor: (f64, f64),
}

/// Перетаскивание области: сама область, смещение курсора от её угла и состав,
/// снятый в момент захвата. Состав — пары «индекс таблицы, её положение тогда»:
/// таблицы едут не за курсором, а ровно на то же смещение, что и область, и
/// ничего не разъезжается, если область упрётся в ограничение.
struct FrameDrag {
    index: usize,
    offset_x: f64,
    offset_y: f64,
    start_x: f64,
    start_y: f64,
    carried: Vec<(usize, f64, f64)>,
}

/// Растягивание области за ручку: какую грань тянут, границы в момент захвата и
/// точка захвата — смещение считается от неё, а не от предыдущего кадра, чтобы
/// ошибка не накапливалась.
struct FrameResize {
    index: usize,
    handle: Handle,
    start: (f64, f64, f64, f64),
    grab: (f64, f64),
}

/// Прямоугольник, который сейчас протягивают по холсту в режиме рисования:
/// точка нажатия и текущая точка курсора, в мировых координатах.
struct Draft {
    ax: f64,
    ay: f64,
    bx: f64,
    by: f64,
}

impl Draft {
    /// Нормализованный прямоугольник — тянуть можно в любую сторону.
    fn rect(&self) -> (f64, f64, f64, f64) {
        (
            self.ax.min(self.bx),
            self.ay.min(self.by),
            (self.bx - self.ax).abs(),
            (self.by - self.ay).abs(),
        )
    }
}

/// The resolved cubic-bezier geometry of a relation, in world coordinates.
/// The two control points share the y of their anchor (`c1.y == ay`,
/// `c2.y == by`), so only their x is stored.
struct Curve {
    ax: f64,
    ay: f64,
    c1x: f64,
    c2x: f64,
    bx: f64,
    by: f64,
    src_right: bool,
    dst_right: bool,
}

impl Curve {
    /// Point on the curve at parameter `t` in `[0, 1]`.
    fn point(&self, t: f64) -> (f64, f64) {
        let mt = 1.0 - t;
        let (a, b, c, d) = (mt * mt * mt, 3.0 * mt * mt * t, 3.0 * mt * t * t, t * t * t);
        let x = a * self.ax + b * self.c1x + c * self.c2x + d * self.bx;
        // Control-point y's equal their anchor y's.
        let y = a * self.ay + b * self.ay + c * self.by + d * self.by;
        (x, y)
    }
}

/// The whole diagram. All hit-testing, camera math, drag/pan state and
/// rendering live here; the JS side only forwards CSS-pixel pointer
/// coordinates and viewport size.
#[wasm_bindgen]
pub struct Scene {
    tables: Vec<Table>,
    relations: Vec<Relation>,
    /// Области в порядке создания — в нём же они и рисуются, слоем под
    /// таблицами. Хит-тест идёт с конца, так что верхняя перекрывающая область
    /// выигрывает у нижней.
    frames: Vec<Frame>,
    /// Сколько таблиц принадлежит документу. Сравнение дописывает в хвост те,
    /// что нашлись только в базе, и по этому числу их потом отрезают обратно —
    /// связи адресуют таблицы индексами, и вырезать из середины было бы нечем.
    doc_tables: usize,
    /// Идёт ли сейчас сравнение с базой: по нему JS подсвечивает кнопку, а
    /// холст знает, что цвета на нём значат больше обычного.
    comparing: bool,
    // Viewport in CSS pixels and the backing-store device-pixel ratio.
    width: f64,
    height: f64,
    dpr: f64,
    // Camera: world = (screen - cam) / scale.
    cam_x: f64,
    cam_y: f64,
    scale: f64,
    drag: Option<DragState>,
    pan: Option<PanState>,
    link: Option<LinkState>,
    frame_drag: Option<FrameDrag>,
    frame_resize: Option<FrameResize>,
    /// Режим рисования области: включается кнопкой в тулбаре и гаснет, как
    /// только прямоугольник протянут или нажат Esc.
    drawing: bool,
    draft: Option<Draft>,
    /// Готовый прямоугольник, которого JS ещё не забрал, — пара к
    /// `take_pending`, только для одноразового черновика.
    draft_done: Option<FrameRect>,
    selected: Option<usize>,
    selected_rel: Option<usize>,
    selected_frame: Option<usize>,
    // The column row whose ports are currently revealed (cursor hovering it).
    hover_col: Option<Endpoint>,
    // Desired CSS cursor for the current pointer state; read by JS. Статическая
    // строка: вариантов горстка, а выбирается он на каждом движении мыши.
    cursor: &'static str,
    laid_out: bool,
    // Изменения, которые JS ещё не сохранил. Сцена только копит их, забирает
    // и очищает — `take_pending`.
    pending_moves: Vec<TablePosition>,
    pending_links: Vec<RelationEndpoints>,
    pending_unlinks: Vec<RelationEndpoints>,
    pending_frames: Vec<FrameBounds>,
}

#[wasm_bindgen]
impl Scene {
    /// Creates a scene pre-populated with a sample database schema so there is
    /// something to look at immediately.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Scene {
        let mut scene = Scene {
            tables: Vec::new(),
            relations: Vec::new(),
            frames: Vec::new(),
            doc_tables: 0,
            comparing: false,
            width: 800.0,
            height: 600.0,
            dpr: 1.0,
            cam_x: 0.0,
            cam_y: 0.0,
            scale: 1.0,
            drag: None,
            pan: None,
            link: None,
            frame_drag: None,
            frame_resize: None,
            drawing: false,
            draft: None,
            draft_done: None,
            selected: None,
            selected_rel: None,
            selected_frame: None,
            hover_col: None,
            cursor: "default",
            laid_out: false,
            pending_moves: Vec::new(),
            pending_links: Vec::new(),
            pending_unlinks: Vec::new(),
            pending_frames: Vec::new(),
        };
        scene.seed_sample();
        scene
    }

    /// Updates the viewport size (CSS pixels) and backing-store ratio. Called
    /// on mount and whenever the canvas is resized.
    pub fn resize(&mut self, width: f64, height: f64, dpr: f64) {
        self.width = width;
        self.height = height;
        self.dpr = dpr;
    }

    /// Index of the currently selected table, or `-1` if none.
    pub fn selected_index(&self) -> i32 {
        self.selected.map_or(-1, |i| i as i32)
    }

    /// Number of tables in the scene.
    pub fn table_count(&self) -> usize {
        self.tables.len()
    }

    /// Id сущности под выделением — по нему JS находит таблицу, чтобы открыть
    /// её форму. Индекс для этого не годится: он живёт только внутри сцены и
    /// разъезжается с любым списком на стороне JS. `None` — ничего не выбрано
    /// либо выбрана таблица демо-схемы, которой в базе нет.
    pub fn selected_id(&self) -> Option<String> {
        let t = self.tables.get(self.selected?)?;
        (!t.id.is_empty()).then(|| t.id.clone())
    }

    /// Appends the table described by `table`, centered in the current viewport,
    /// and selects it. Flags the layout dirty so the next render measures the
    /// new table's text and fits its width.
    ///
    /// `table` is `{ id, name, fields: [{ name, pk, nullable }] }` — the very
    /// object the JS form just sent to `create_erd_schema`, plus the id that
    /// command returned, so the drawn table and the persisted entity cannot
    /// disagree. A brand-new table takes part in no relations yet, so none of
    /// its columns can be a foreign key.
    pub fn add_table(&mut self, table: JsValue) -> Result<(), JsValue> {
        let dto: NewTableDTO = serde_wasm_bindgen::from_value(table)?;

        let columns: Vec<Column> = dto
            .fields
            .iter()
            .map(|f| Column::new(f.name.clone(), f.pk, f.nullable))
            .collect();

        // Center on the viewport by the table's full height. Offsetting by the
        // header alone was fine for the fixed three-row template, but a table
        // the form filled with a dozen columns would hang off the bottom.
        let (wx, wy) = self.screen_to_world(self.width * 0.5, self.height * 0.5);
        let h = HEADER_H + columns.len() as f64 * ROW_H;
        let (x, y) = (wx - MIN_TABLE_W * 0.5, wy - h * 0.5);

        // Позиция уходит на запись сразу: иначе после перезагрузки таблица
        // уехала бы в сетку автолейаута, а не осталась там, где появилась.
        self.pending_moves.push(TablePosition {
            id: dto.id.clone(),
            x,
            y,
        });

        // Новая таблица встаёт в конец, а там во время сравнения стоят
        // призраки — сравнение приходится сбросить. Страница после создания
        // всё равно перечитывает диаграмму и, если сравнивала, повторяет его.
        self.reset_diff();
        self.comparing = false;

        self.tables
            .push(Table::new(dto.id, dto.name, columns, x, y));
        self.doc_tables = self.tables.len();
        self.selected = Some(self.tables.len() - 1);
        self.laid_out = false;
        Ok(())
    }

    /// Replaces the scene's contents with a diagram built from persisted data:
    /// the `entities` and `relations` are the JSON returned by the `read_schemas`
    /// and `read_relations` Tauri commands, forwarded as-is from JS.
    ///
    /// A table keeps the position it was last dragged to (`posX` / `posY`); an
    /// entity that has none yet is auto-laid-out in a simple column grid and
    /// that result is queued for saving, so the grid runs exactly once in an
    /// entity's life and every later open rebuilds the diagram from the database.
    ///
    /// Relations are remapped from `(entityId, fieldName)` addressing to the
    /// positional `(tableIndex, columnIndex)` the renderer uses; any endpoint
    /// that cannot be resolved drops the relation. Column icons are derived from
    /// the resulting relation set by [`Scene::refresh_kinds`].
    ///
    /// `frames` — области диаграммы (`read_erd_frames`). Они ложатся на холст
    /// как есть: автолейаута у области нет, её прямоугольник всегда нарисован
    /// руками.
    pub fn load(
        &mut self,
        entities: JsValue,
        relations: JsValue,
        frames: JsValue,
    ) -> Result<(), JsValue> {
        let entities: Vec<EntityDTO> = serde_wasm_bindgen::from_value(entities)?;
        let relations: Vec<RelationDTO> = serde_wasm_bindgen::from_value(relations)?;
        let frames: Vec<FrameDTO> = serde_wasm_bindgen::from_value(frames)?;

        // Что не успели сохранить для прошлой диаграммы, к этой отношения не имеет.
        self.pending_moves.clear();
        self.pending_links.clear();
        self.pending_unlinks.clear();
        self.pending_frames.clear();

        // (entity id, field name) -> (table index, column index), so relation
        // endpoints can be resolved to the positional form the scene uses.
        let mut endpoint_of: HashMap<(String, String), Endpoint> = HashMap::new();

        let mut tables = Vec::with_capacity(entities.len());
        for (ti, entity) in entities.iter().enumerate() {
            let columns = entity
                .fields
                .iter()
                .enumerate()
                .map(|(ci, f)| {
                    endpoint_of.insert((entity.id.clone(), f.name.clone()), (ti, ci));
                    Column::new(f.name.clone(), f.pk, f.nullable)
                })
                .collect();

            // Column-grid placement; widths are measured later in `ensure_layout`.
            const ORIGIN: f64 = 40.0;
            const COL_W: f64 = 260.0;
            const GAP_Y: f64 = 40.0;
            let cols = (entities.len() as f64).sqrt().ceil().max(1.0) as usize;
            let col = ti % cols;
            // Stack vertically within each grid column so tall tables don't overlap.
            let auto_y = ORIGIN
                + tables
                    .iter()
                    .skip(col)
                    .step_by(cols)
                    .map(|t: &Table| t.height() + GAP_Y)
                    .sum::<f64>();
            let auto_x = ORIGIN + col as f64 * COL_W;

            // Сохранённая позиция всегда побеждает автолейаут.
            let (x, y) = match (entity.pos_x, entity.pos_y) {
                (Some(x), Some(y)) => (x, y),
                _ => {
                    self.pending_moves.push(TablePosition {
                        id: entity.id.clone(),
                        x: auto_x,
                        y: auto_y,
                    });
                    (auto_x, auto_y)
                }
            };

            tables.push(Table::new(
                entity.id.clone(),
                entity.name.clone(),
                columns,
                x,
                y,
            ));
        }

        let relations = relations
            .iter()
            .filter_map(|r| {
                let from = *endpoint_of.get(&(r.from_entity.clone(), r.from_field.clone()))?;
                let to = *endpoint_of.get(&(r.to_entity.clone(), r.to_field.clone()))?;
                Some(Relation::new(from, to))
            })
            .collect();

        self.doc_tables = tables.len();
        self.comparing = false;
        self.tables = tables;
        self.relations = relations;
        self.frames = frames
            .into_iter()
            .map(|f| Frame::new(f.id, f.title, f.x, f.y, f.w, f.h))
            .collect();
        self.selected = None;
        self.selected_rel = None;
        self.selected_frame = None;
        self.hover_col = None;
        self.drag = None;
        self.pan = None;
        self.link = None;
        self.frame_drag = None;
        self.frame_resize = None;
        self.drawing = false;
        self.draft = None;
        self.laid_out = false;
        self.refresh_kinds();
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Области
    // -----------------------------------------------------------------------

    /// Добавляет область, которую команда `create_erd_frame` только что
    /// завела, и выделяет её — чтобы ручки растягивания появились сразу.
    /// Границы приходят обратно те же, что сцена отдала в [`Scene::take_draft`],
    /// так что нарисованное и сохранённое не могут разойтись.
    pub fn add_frame(&mut self, frame: JsValue) -> Result<(), JsValue> {
        let dto: FrameDTO = serde_wasm_bindgen::from_value(frame)?;
        self.frames
            .push(Frame::new(dto.id, dto.title, dto.x, dto.y, dto.w, dto.h));
        self.selected_frame = Some(self.frames.len() - 1);
        self.selected = None;
        self.selected_rel = None;
        Ok(())
    }

    /// Меняет подпись области. Молча ничего не делает, если области с таким id
    /// на холсте уже нет.
    pub fn rename_frame(&mut self, id: &str, title: &str) {
        if let Some(f) = self.frames.iter_mut().find(|f| f.id == id) {
            f.title = title.to_string();
        }
    }

    /// Убирает область с холста. Таблицы, которые в ней лежали, остаются на
    /// месте: членство геометрическое, и уносить с собой области нечего.
    pub fn remove_frame(&mut self, id: &str) {
        let Some(i) = self.frames.iter().position(|f| f.id == id) else {
            return;
        };
        self.frames.remove(i);
        self.selected_frame = None;
        self.frame_drag = None;
        self.frame_resize = None;
        // Ждавшие записи границы этой области больше ни к чему не относятся.
        self.pending_frames.retain(|b| b.id != id);
    }

    /// Id выделенной области — по нему JS открывает её форму. `None`, если
    /// выделена таблица, связь или ничего.
    pub fn selected_frame_id(&self) -> Option<String> {
        Some(self.frames.get(self.selected_frame?)?.id.clone())
    }

    /// Включает режим рисования: следующее протаскивание по холсту задаёт
    /// прямоугольник новой области.
    pub fn begin_draw_frame(&mut self) {
        self.drawing = true;
        self.draft = None;
        self.cursor = "crosshair";
    }

    /// Выходит из режима рисования, бросив незаконченный прямоугольник (Esc).
    /// Возвращает `true`, если было что бросать, — тогда нужна перерисовка.
    pub fn cancel_draw_frame(&mut self) -> bool {
        let had = self.drawing || self.draft.is_some();
        self.drawing = false;
        self.draft = None;
        self.cursor = "default";
        had
    }

    /// Идёт ли сейчас рисование области — по этому флагу JS подсвечивает
    /// кнопку в тулбаре.
    pub fn is_drawing(&self) -> bool {
        self.drawing
    }

    /// Протянут ли прямоугольник, которого JS ещё не забрал.
    pub fn has_draft(&self) -> bool {
        self.draft_done.is_some()
    }

    /// Забирает нарисованный прямоугольник `{ x, y, w, h }`. Сцена не заводит
    /// область сама: id выдаёт база, и до ответа команды рисовать нечего.
    pub fn take_draft(&mut self) -> Result<JsValue, JsValue> {
        let rect = self.draft_done.take();
        Ok(serde_wasm_bindgen::to_value(&rect)?)
    }

    /// Допуск попадания в мировых пикселях: на экране он всегда одинаков,
    /// поэтому на отдалении кольцо захвата рамки в мире шире.
    fn hit_tol(&self, screen_px: f64) -> f64 {
        screen_px / self.scale
    }

    // -----------------------------------------------------------------------
    // Сравнение с живой базой
    // -----------------------------------------------------------------------

    /// Накладывает на холст результат `compare_erd_with_db`.
    ///
    /// Таблица, известная обеим сторонам, остаётся одна: ей проставляется
    /// статус, а колонки, которые нашлись только в базе, дописываются ей в
    /// хвост. Таблицы, которых на диаграмме нет, добавляются «призраками» — без
    /// id, на месте, посчитанном раскладкой на бэкенде. Связи, найденные по
    /// внешним ключам, дорисовываются пунктиром.
    ///
    /// Призрак нельзя ни сохранить, ни связать: id ему взять неоткуда. Поэтому
    /// портов у него нет, позиция его никуда не пишется, а форму правки он не
    /// открывает.
    pub fn set_diff(&mut self, diff: JsValue) -> Result<(), JsValue> {
        let dto: DiffDTO = serde_wasm_bindgen::from_value(diff)?;
        self.apply_diff(dto);
        Ok(())
    }

    /// Наложение уже разобранного ответа. Отдельно от [`Scene::set_diff`],
    /// чтобы правила наложения проверялись тестами: `JsValue` вне браузера не
    /// собрать.
    fn apply_diff(&mut self, dto: DiffDTO) {
        // С чистого листа: повторное сравнение не должно наслаиваться на
        // прошлое своими же призраками.
        self.reset_diff();

        for table in &dto.tables {
            let Some(id) = table.id.as_deref() else {
                continue;
            };
            let Some(ti) = self.tables.iter().position(|t| t.id == id) else {
                continue;
            };

            let target = &mut self.tables[ti];
            target.status = DiffStatus::from_wire(&table.status);

            for column in &table.columns {
                let status = DiffStatus::from_wire(&column.status);
                match target
                    .columns
                    .iter_mut()
                    .find(|c| fold(&c.name) == fold(&column.name))
                {
                    Some(found) => found.status = status,
                    None => {
                        let mut extra =
                            Column::new(column.name.clone(), column.pk, column.nullable);
                        extra.status = status;
                        target.columns.push(extra);
                    }
                }
            }
        }

        // Призраки — только в хвост: связи адресуют таблицы индексами, и
        // вставка в середину сдвинула бы уже нарисованное.
        for table in &dto.tables {
            if table.id.is_some() {
                continue;
            }
            let columns = table
                .columns
                .iter()
                .map(|c| {
                    let mut column = Column::new(c.name.clone(), c.pk, c.nullable);
                    column.status = DiffStatus::from_wire(&c.status);
                    column
                })
                .collect();
            let mut ghost = Table::new(
                "",
                table.name.clone(),
                columns,
                table.x.unwrap_or(0.0),
                table.y.unwrap_or(0.0),
            );
            ghost.status = DiffStatus::OnlyInDb;
            self.tables.push(ghost);
        }

        // Концы связей приходят именами: и документ, и база описывают их так.
        let mut endpoint_of: HashMap<(String, String), Endpoint> = HashMap::new();
        for (ti, table) in self.tables.iter().enumerate() {
            for (ci, column) in table.columns.iter().enumerate() {
                endpoint_of.insert((fold(&table.name), fold(&column.name)), (ti, ci));
            }
        }

        for relation in &dto.relations {
            let status = DiffStatus::from_wire(&relation.status);
            let ends = (
                endpoint_of.get(&(fold(&relation.from_table), fold(&relation.from_column))),
                endpoint_of.get(&(fold(&relation.to_table), fold(&relation.to_column))),
            );
            let (Some(&from), Some(&to)) = ends else {
                continue;
            };

            if status == DiffStatus::OnlyInDb {
                let mut drawn = Relation::new(from, to);
                drawn.status = status;
                self.relations.push(drawn);
            } else if let Some(found) = self.relations.iter_mut().find(|r| r.connects(from, to)) {
                found.status = status;
            }
        }

        self.comparing = true;
        self.laid_out = false;
        self.refresh_kinds();
    }

    /// Снимает сравнение: призраки и дорисованные связи уходят, цвета
    /// возвращаются к обычным.
    pub fn clear_diff(&mut self) {
        self.reset_diff();
        self.comparing = false;
    }

    /// Идёт ли сейчас сравнение.
    pub fn is_comparing(&self) -> bool {
        self.comparing
    }

    /// Имя выделенной таблицы, которой на диаграмме нет. По нему JS предлагает
    /// перенести её в документ. `None` — выделено что-то другое.
    pub fn selected_ghost_name(&self) -> Option<String> {
        let table = self.tables.get(self.selected?)?;
        (table.id.is_empty() && table.status == DiffStatus::OnlyInDb).then(|| table.name.clone())
    }

    /// Возвращает холст к тому, что лежит в документе: призраки отрезаются,
    /// дорисованные связи убираются, статусы гаснут.
    ///
    /// Отрезать можно именно хвостом: призраки всегда дописываются в конец, а
    /// связи на них помечены `OnlyInDb` и уходят вместе с ними — иначе индексы
    /// оставшихся связей разъехались бы.
    fn reset_diff(&mut self) {
        self.relations.retain(|r| r.status != DiffStatus::OnlyInDb);
        for relation in &mut self.relations {
            relation.status = DiffStatus::Same;
        }

        self.tables.truncate(self.doc_tables);
        for table in &mut self.tables {
            table.status = DiffStatus::Same;
            table.columns.truncate(table.doc_cols);
            for column in &mut table.columns {
                column.status = DiffStatus::Same;
            }
        }

        // Всё, что адресовало призрака или связь на него, больше ни к чему не
        // разрешается.
        if self.selected.is_some_and(|i| i >= self.tables.len()) {
            self.selected = None;
        }
        self.selected_rel = None;
        self.hover_col = None;
        self.drag = None;
        self.link = None;
        self.laid_out = false;
        self.refresh_kinds();
    }

    fn screen_to_world(&self, x: f64, y: f64) -> (f64, f64) {
        ((x - self.cam_x) / self.scale, (y - self.cam_y) / self.scale)
    }

    /// The CSS cursor name matching the current pointer state. Read by JS after
    /// every pointer event.
    pub fn cursor(&self) -> String {
        self.cursor.to_string()
    }

    /// Routes a left-button press, in priority order: draw a frame, delete a
    /// selected relation via its badge, resize the selected frame, start a
    /// relation drag from a column port, select a relation curve, drag a table,
    /// drag a frame by its title or border, or pan. Coordinates are CSS pixels.
    ///
    /// Таблица стоит в этом списке выше области, хотя рисуется поверх неё: так
    /// таблица, лежащая на области, остаётся кликабельной, а область ловит
    /// только то, что мимо неё не попало.
    pub fn on_mouse_down(&mut self, x: f64, y: f64) -> bool {
        let (wx, wy) = self.screen_to_world(x, y);

        // 0. Режим рисования занимает холст целиком: пока он включён, нажатие
        //    ничем другим не перехватывается.
        if self.drawing {
            self.draft = Some(Draft {
                ax: wx,
                ay: wy,
                bx: wx,
                by: wy,
            });
            self.selected = None;
            self.selected_rel = None;
            self.selected_frame = None;
            self.cursor = "crosshair";
            return true;
        }

        // 1. The delete badge of the currently selected relation.
        if let Some(ri) = self.selected_rel {
            if self.over_delete_badge(ri, wx, wy) {
                // Концы снимаем до удаления: после него индекс уже ни к чему
                // не разрешается.
                if let Some(ends) = self.relation_endpoints(ri) {
                    self.pending_unlinks.push(ends);
                }
                self.relations.remove(ri);
                self.selected_rel = None;
                self.cursor = "default";
                self.refresh_kinds();
                return false;
            }
        }

        // 2. Ручка выделенной области. Ручки торчат по её граням, где под ними
        //    может оказаться таблица, поэтому ловятся раньше всех — но только
        //    у выделенной области, у которой они и нарисованы.
        if let Some(fi) = self.selected_frame {
            let tol = self.hit_tol(HANDLE_HIT);
            let grabbed = self
                .frames
                .get(fi)
                .and_then(|f| f.handle_at(wx, wy, tol).map(|h| (h, (f.x, f.y, f.w, f.h))));
            if let Some((handle, start)) = grabbed {
                self.frame_resize = Some(FrameResize {
                    index: fi,
                    handle,
                    start,
                    grab: (wx, wy),
                });
                self.cursor = handle.cursor();
                return false;
            }
        }

        // 3. A column port — start drawing a new relation.
        if let Some((ti, ci, right)) = self.hit_port(wx, wy) {
            self.selected = None;
            self.selected_rel = None;
            self.selected_frame = None;
            self.link = Some(LinkState {
                from: (ti, ci),
                from_right: right,
                cursor: (wx, wy),
            });
            self.cursor = "crosshair";
            return false;
        }

        // 4. A relation curve — select it.
        if let Some(ri) = self.hit_relation(wx, wy) {
            self.selected = None;
            self.selected_rel = Some(ri);
            self.selected_frame = None;
            self.cursor = "pointer";
            return false;
        }

        // 5. A table body — drag it.
        if let Some(index) = self.tables.iter().rposition(|t| t.contains(wx, wy)) {
            let t = &self.tables[index];
            self.drag = Some(DragState {
                index,
                offset_x: wx - t.x,
                offset_y: wy - t.y,
                start_x: t.x,
                start_y: t.y,
            });
            self.selected = Some(index);
            self.selected_rel = None;
            self.selected_frame = None;
            self.cursor = "grabbing";
            return true;
        }

        // 6. Подпись или рамка области — тянуть её вместе с содержимым.
        let tol = self.hit_tol(FRAME_HIT);
        if let Some(fi) = self
            .frames
            .iter()
            .rposition(|f| f.on_title(wx, wy) || f.on_border(wx, wy, tol))
        {
            let (fx, fy) = (self.frames[fi].x, self.frames[fi].y);
            self.frame_drag = Some(FrameDrag {
                index: fi,
                offset_x: wx - fx,
                offset_y: wy - fy,
                start_x: fx,
                start_y: fy,
                carried: self.carried_by(fi),
            });
            self.selected = None;
            self.selected_rel = None;
            self.selected_frame = Some(fi);
            self.cursor = "grabbing";
            return true;
        }

        // 7. Тело области или пустота: выделяем область под курсором — чтобы
        //    показались её ручки — и панорамируем. Тело области перетаскивание
        //    не начинает: иначе большая область отняла бы у холста пан.
        let inside = self.frames.iter().rposition(|f| f.contains(wx, wy));
        let dirty =
            self.selected.is_some() || self.selected_rel.is_some() || self.selected_frame != inside;
        self.selected = None;
        self.selected_rel = None;
        self.selected_frame = inside;
        self.pan = Some(PanState {
            start_x: x,
            start_y: y,
            cam_x: self.cam_x,
            cam_y: self.cam_y,
        });
        self.cursor = "grabbing";
        dirty
    }

    /// Состав области: индексы таблиц, целиком лежащих внутри неё, вместе с их
    /// положением на момент вызова. Снимается один раз — в момент захвата, —
    /// поэтому таблица, выехавшая за грань по дороге, всё равно доедет с
    /// областью до конца перетаскивания.
    fn carried_by(&self, fi: usize) -> Vec<(usize, f64, f64)> {
        let Some(frame) = self.frames.get(fi) else {
            return Vec::new();
        };
        self.tables
            .iter()
            .enumerate()
            .filter(|(_, t)| frame.holds(t.x, t.y, t.w, t.height()))
            .map(|(i, t)| (i, t.x, t.y))
            .collect()
    }

    /// Updates whatever interaction is live (table drag, relation drag, pan) or,
    /// when idle, refreshes hover state and the cursor. Returns `true` when a
    /// redraw is needed.
    pub fn on_mouse_move(&mut self, x: f64, y: f64) -> bool {
        let (wx, wy) = self.screen_to_world(x, y);

        if let Some(draft) = self.draft.as_mut() {
            draft.bx = wx;
            draft.by = wy;
            self.cursor = "crosshair";
            return true;
        }

        if self.drawing {
            self.cursor = "crosshair";
            // Порты в режиме рисования не нужны: кликнуть по ним всё равно
            // нельзя, а мигающие кружки под крестиком только мешают.
            return self.hover_col.take().is_some();
        }

        if let Some(rz) = &self.frame_resize {
            let (index, handle) = (rz.index, rz.handle);
            let (x, y, w, h) = Frame::resized(rz.start, handle, wx - rz.grab.0, wy - rz.grab.1);
            if let Some(f) = self.frames.get_mut(index) {
                f.x = x;
                f.y = y;
                f.w = w;
                f.h = h;
            }
            self.cursor = handle.cursor();
            return true;
        }

        // Область забирается из поля целиком: двигать нужно и её, и таблицы, а
        // одолженная ссылка на состав не дала бы тронуть ни то, ни другое.
        if let Some(fd) = self.frame_drag.take() {
            let (nx, ny) = (wx - fd.offset_x, wy - fd.offset_y);
            let (dx, dy) = (nx - fd.start_x, ny - fd.start_y);
            if let Some(f) = self.frames.get_mut(fd.index) {
                f.x = nx;
                f.y = ny;
            }
            for &(ti, sx, sy) in &fd.carried {
                if let Some(t) = self.tables.get_mut(ti) {
                    t.x = sx + dx;
                    t.y = sy + dy;
                }
            }
            self.frame_drag = Some(fd);
            self.cursor = "grabbing";
            return true;
        }

        if let Some(drag) = &self.drag {
            if let Some(t) = self.tables.get_mut(drag.index) {
                t.x = wx - drag.offset_x;
                t.y = wy - drag.offset_y;
            }
            self.cursor = "grabbing";
            return true;
        }

        if self.link.is_some() {
            // Reveal the prospective target row's ports while dragging.
            let target = self
                .hit_row(wx, wy)
                .filter(|(ti, _)| !self.tables[*ti].id.is_empty());
            if let Some(link) = self.link.as_mut() {
                link.cursor = (wx, wy);
            }
            self.hover_col = target;
            self.cursor = "crosshair";
            return true;
        }

        if let Some(pan) = &self.pan {
            self.cam_x = pan.cam_x + (x - pan.start_x);
            self.cam_y = pan.cam_y + (y - pan.start_y);
            self.cursor = "grabbing";
            return true;
        }

        // Idle hover: ports follow the row under the cursor; pick a cursor.
        let prev = self.hover_col;
        self.hover_col = self
            .hit_row(wx, wy)
            .filter(|(ti, _)| !self.tables[*ti].id.is_empty());

        let over_badge = self
            .selected_rel
            .is_some_and(|ri| self.over_delete_badge(ri, wx, wy));

        let handle_tol = self.hit_tol(HANDLE_HIT);
        let over_handle = self
            .selected_frame
            .and_then(|fi| self.frames.get(fi))
            .and_then(|f| f.handle_at(wx, wy, handle_tol))
            .map(Handle::cursor);

        let frame_tol = self.hit_tol(FRAME_HIT);

        self.cursor = if let Some(c) = over_handle {
            c
        } else if over_badge {
            "pointer"
        } else if self.hit_port(wx, wy).is_some() {
            "crosshair"
        } else if self.hit_relation(wx, wy).is_some() {
            "pointer"
        } else if self.tables.iter().any(|t| t.contains(wx, wy)) {
            "grab"
        } else if self
            .frames
            .iter()
            .any(|f| f.on_title(wx, wy) || f.on_border(wx, wy, frame_tol))
        {
            "grab"
        } else {
            "default"
        };

        prev != self.hover_col
    }

    /// Ends any interaction. A relation drag dropped on a column row of a
    /// different table creates a new relation; a table drag that actually moved
    /// the table queues its new position. Returns `true` when a redraw is needed.
    pub fn on_mouse_up(&mut self, x: f64, y: f64) -> bool {
        let mut dirty = false;

        // Прямоугольник дорисован. Область сцена не заводит: id выдаёт база, и
        // до ответа команды рисовать нечего — геометрия ложится в черновик,
        // который JS забирает сразу после этого вызова.
        if let Some(draft) = self.draft.take() {
            self.drawing = false;
            self.cursor = "default";
            let (dx, dy, dw, dh) = draft.rect();
            if dw >= DRAFT_MIN && dh >= DRAFT_MIN {
                self.draft_done = Some(FrameRect {
                    x: dx,
                    y: dy,
                    w: dw.max(FRAME_MIN_W),
                    h: dh.max(FRAME_MIN_H),
                });
            }
            dirty = true;
        }

        // Область отпустили. Пишем и её границы, и положение всего, что она
        // увезла с собой, — одной пачкой, как и обычное перетаскивание таблицы.
        if let Some(fd) = self.frame_drag.take() {
            let moved = self
                .frames
                .get(fd.index)
                .is_some_and(|f| f.x != fd.start_x || f.y != fd.start_y);
            if moved {
                if let Some(f) = self.frames.get(fd.index) {
                    self.pending_frames.push(FrameBounds {
                        id: f.id.clone(),
                        x: f.x,
                        y: f.y,
                        w: f.w,
                        h: f.h,
                    });
                }
                for &(ti, _, _) in &fd.carried {
                    if let Some(t) = self.tables.get(ti) {
                        if !t.id.is_empty() {
                            self.pending_moves.push(TablePosition {
                                id: t.id.clone(),
                                x: t.x,
                                y: t.y,
                            });
                        }
                    }
                }
            }
            dirty = true;
        }

        if let Some(rz) = self.frame_resize.take() {
            if let Some(f) = self.frames.get(rz.index) {
                if (f.x, f.y, f.w, f.h) != rz.start {
                    self.pending_frames.push(FrameBounds {
                        id: f.id.clone(),
                        x: f.x,
                        y: f.y,
                        w: f.w,
                        h: f.h,
                    });
                }
            }
            dirty = true;
        }

        if let Some(link) = self.link.take() {
            let (wx, wy) = self.screen_to_world(x, y);
            // Связь на призрака не заводится по той же причине, по которой у
            // него нет портов: сохранить её нечем.
            if let Some((ti, ci)) = self
                .hit_row(wx, wy)
                .filter(|(ti, _)| !self.tables[*ti].id.is_empty())
            {
                let to: Endpoint = (ti, ci);
                // Внутри одной таблицы связь тоже имеет смысл (`parent_id →
                // id`), бессмысленна только петля колонки на саму себя.
                let valid =
                    to != link.from && !self.relations.iter().any(|r| r.connects(link.from, to));
                if valid {
                    self.relations.push(Relation::new(link.from, to));
                    let ri = self.relations.len() - 1;
                    self.selected_rel = Some(ri);
                    // Иконка FK должна появиться сразу, а не после перезагрузки.
                    self.refresh_kinds();
                    if let Some(ends) = self.relation_endpoints(ri) {
                        self.pending_links.push(ends);
                    }
                }
            }
            dirty = true;
        }

        // Таблицу отпустили. Позицию сохраняем, только если она действительно
        // изменилась — иначе каждый клик по таблице писал бы в базу.
        if let Some(drag) = self.drag.take() {
            if let Some(t) = self.tables.get(drag.index) {
                if !t.id.is_empty() && (t.x != drag.start_x || t.y != drag.start_y) {
                    self.pending_moves.push(TablePosition {
                        id: t.id.clone(),
                        x: t.x,
                        y: t.y,
                    });
                }
            }
            // Перерисовать нужно в любом случае: сцена вышла из движения, и к
            // карточкам возвращаются тени.
            dirty = true;
        }

        self.pan = None;
        dirty
    }

    /// Whether a table drag, relation drag, frame drag/resize, frame drawing,
    /// or pan is currently active.
    pub fn is_interacting(&self) -> bool {
        self.drag.is_some()
            || self.pan.is_some()
            || self.link.is_some()
            || self.frame_drag.is_some()
            || self.frame_resize.is_some()
            || self.draft.is_some()
    }

    // -----------------------------------------------------------------------
    // Persistence hand-off
    // -----------------------------------------------------------------------

    /// Whether anything is waiting to be saved. A cheap guard so JS can skip
    /// serializing an empty batch after every pointer event.
    pub fn has_pending(&self) -> bool {
        !self.pending_moves.is_empty()
            || !self.pending_links.is_empty()
            || !self.pending_unlinks.is_empty()
            || !self.pending_frames.is_empty()
    }

    /// Takes the accumulated changes — `{ moves, links, unlinks, frames }` — and clears
    /// the queue. The scene deliberately does not persist anything itself: it
    /// only records what changed, and JS spends the batch on the matching Tauri
    /// commands.
    pub fn take_pending(&mut self) -> Result<JsValue, JsValue> {
        let pending = Pending {
            moves: std::mem::take(&mut self.pending_moves),
            links: std::mem::take(&mut self.pending_links),
            unlinks: std::mem::take(&mut self.pending_unlinks),
            frames: std::mem::take(&mut self.pending_frames),
        };
        Ok(serde_wasm_bindgen::to_value(&pending)?)
    }

    /// Relation `ri`'s two ends in database terms. `None` when the relation
    /// touches a table with no entity id (the pre-`load` sample schema) or a
    /// column index that no longer resolves.
    fn relation_endpoints(&self, ri: usize) -> Option<RelationEndpoints> {
        let rel = self.relations.get(ri)?;
        let from = self.tables.get(rel.from.0)?;
        let to = self.tables.get(rel.to.0)?;
        if from.id.is_empty() || to.id.is_empty() {
            return None;
        }
        Some(RelationEndpoints {
            from_entity: from.id.clone(),
            from_field: from.columns.get(rel.from.1)?.name.clone(),
            to_entity: to.id.clone(),
            to_field: to.columns.get(rel.to.1)?.name.clone(),
        })
    }

    /// Recomputes every column's icon from the current relation set: primary
    /// keys win, then the foreign-key side of a relation, then nullability.
    /// Called after any change to the relations so what is on screen matches
    /// what a reload would draw.
    fn refresh_kinds(&mut self) {
        let fk: HashSet<Endpoint> = self.relations.iter().map(|r| r.to).collect();
        for (ti, table) in self.tables.iter_mut().enumerate() {
            for (ci, col) in table.columns.iter_mut().enumerate() {
                col.kind = col_kind(col.pk, col.nullable, fk.contains(&(ti, ci)));
            }
        }
    }

    // -----------------------------------------------------------------------
    // Hit-testing
    // -----------------------------------------------------------------------

    /// The `(table, column)` row at a world point, if the point is over a
    /// column row (not the header) of some table. Topmost table wins.
    fn hit_row(&self, wx: f64, wy: f64) -> Option<Endpoint> {
        for (ti, t) in self.tables.iter().enumerate().rev() {
            if !t.contains(wx, wy) || wy < t.y + HEADER_H {
                continue;
            }
            let idx = ((wy - t.y - HEADER_H) / ROW_H).floor() as usize;
            if idx < t.columns.len() {
                return Some((ti, idx));
            }
            return None;
        }
        None
    }

    /// The column port near a world point: `(table, column, on_right_edge)`.
    /// Ports sit at each row's vertical center on the left and right edges.
    fn hit_port(&self, wx: f64, wy: f64) -> Option<(usize, usize, bool)> {
        for (ti, t) in self.tables.iter().enumerate().rev() {
            // У таблицы, которой нет в документе, портов нет: связь от неё
            // некуда записать — её концы адресуются id сущностей.
            if t.id.is_empty() {
                continue;
            }
            // Порты сидят на боках таблицы, поэтому дальше её габаритов плюс
            // допуск искать нечего — иначе на каждое движение мыши перебирались
            // бы все колонки всех таблиц схемы.
            if wx < t.x - PORT_HIT
                || wx > t.x + t.w + PORT_HIT
                || wy < t.y - PORT_HIT
                || wy > t.y + t.height() + PORT_HIT
            {
                continue;
            }
            for ci in 0..t.columns.len() {
                let cy = t.row_y(ci);
                for (right, px) in [(false, t.x), (true, t.x + t.w)] {
                    if (wx - px).powi(2) + (wy - cy).powi(2) <= PORT_HIT * PORT_HIT {
                        return Some((ti, ci, right));
                    }
                }
            }
        }
        None
    }

    /// Index of the relation whose curve passes near a world point.
    fn hit_relation(&self, wx: f64, wy: f64) -> Option<usize> {
        // Tolerance is a screen distance, so widen it as the scene zooms out.
        let tol = (REL_HIT / self.scale).max(REL_HIT);
        for (i, rel) in self.relations.iter().enumerate() {
            let Some(c) = self.rel_curve(rel) else {
                continue;
            };
            // Дешёвая отбраковка по габаритам кривой: иначе на каждое движение
            // мыши считались бы по 24 точки безье на каждую связь схемы.
            let x0 = c.ax.min(c.bx).min(c.c1x).min(c.c2x) - tol;
            let x1 = c.ax.max(c.bx).max(c.c1x).max(c.c2x) + tol;
            let y0 = c.ay.min(c.by) - tol;
            let y1 = c.ay.max(c.by) + tol;
            if wx < x0 || wx > x1 || wy < y0 || wy > y1 {
                continue;
            }
            const N: usize = 24;
            let mut prev = c.point(0.0);
            for k in 1..=N {
                let p = c.point(k as f64 / N as f64);
                if dist_to_segment(wx, wy, prev, p) <= tol {
                    return Some(i);
                }
                prev = p;
            }
        }
        None
    }

    /// Whether a world point falls on relation `ri`'s delete badge (its curve
    /// midpoint).
    fn over_delete_badge(&self, ri: usize, wx: f64, wy: f64) -> bool {
        self.relations
            .get(ri)
            .and_then(|rel| self.rel_curve(rel))
            .map(|c| c.point(0.5))
            .is_some_and(|(mx, my)| (wx - mx).powi(2) + (wy - my).powi(2) <= BADGE_R * BADGE_R)
    }

    /// Resolves a relation's bezier geometry from the current table positions.
    fn rel_curve(&self, rel: &Relation) -> Option<Curve> {
        let src = self.tables.get(rel.from.0)?;
        let dst = self.tables.get(rel.to.0)?;
        if rel.from.1 >= src.columns.len() || rel.to.1 >= dst.columns.len() {
            return None;
        }

        // Ссылка таблицы на саму себя (`parent_id → id` есть едва ли не в
        // каждой схеме) рисуется петлёй у правой грани: обе опоры на одной
        // стороне, кривая выгибается наружу. Общая ветка ниже тут не годится —
        // она выбирает стороны по центрам таблиц, а у одной таблицы центр один,
        // и линия прошла бы сквозь неё саму.
        if rel.from.0 == rel.to.0 {
            let x = src.x + src.w;
            let ay = src.row_y(rel.from.1);
            let by = src.row_y(rel.to.1);
            // Вынос растёт с расстоянием между строками: у соседних петля иначе
            // вырождается в плоский штрих. Потолок держит её в пределах
            // просвета, который раскладка оставляет между слоями.
            let dx = ((ay - by).abs() * 0.8).clamp(56.0, 130.0);

            return Some(Curve {
                ax: x,
                ay,
                c1x: x + dx,
                c2x: x + dx,
                bx: x,
                by,
                src_right: true,
                dst_right: true,
            });
        }

        let src_right = src.center_x() <= dst.center_x();
        let dst_right = !src_right;
        let ax = if src_right { src.x + src.w } else { src.x };
        let ay = src.row_y(rel.from.1);
        let bx = if dst_right { dst.x + dst.w } else { dst.x };
        let by = dst.row_y(rel.to.1);
        let dx = ((bx - ax).abs() * 0.5).max(40.0);
        let c1x = ax + if src_right { dx } else { -dx };
        let c2x = bx + if dst_right { dx } else { -dx };

        Some(Curve {
            ax,
            ay,
            c1x,
            c2x,
            bx,
            by,
            src_right,
            dst_right,
        })
    }

    /// Zooms toward the cursor by `factor`, keeping the world point under the
    /// cursor fixed on screen. Coordinates are CSS pixels.
    pub fn zoom(&mut self, x: f64, y: f64, factor: f64) {
        let (wx, wy) = self.screen_to_world(x, y);
        self.scale = (self.scale * factor).clamp(0.25, 2.5);
        self.cam_x = x - wx * self.scale;
        self.cam_y = y - wy * self.scale;
    }

    // -----------------------------------------------------------------------
    // Rendering
    // -----------------------------------------------------------------------

    /// Видимая область в мировых координатах, расширенная на запас под тени и
    /// рамки, — чтобы у края экрана ничего не мигало.
    fn viewport(&self) -> Viewport {
        const MARGIN: f64 = 48.0;
        Viewport {
            left: -self.cam_x / self.scale - MARGIN,
            top: -self.cam_y / self.scale - MARGIN,
            right: (self.width - self.cam_x) / self.scale + MARGIN,
            bottom: (self.height - self.cam_y) / self.scale + MARGIN,
        }
    }

    /// Clears and redraws the whole scene: grid, frames, relations, then
    /// tables. Порядок и есть группировка: области лежат слоем под таблицами,
    /// поэтому таблица, поставленная на область, видна целиком, а область
    /// читается как подложка под ней.
    ///
    /// Кадр стоит ровно столько, сколько видно на экране: за его пределами не
    /// рисуется ничего, а на отдалении таблицы теряют строки колонок. Без этого
    /// схема на сотню таблиц перерисовывалась целиком на каждое движение мыши.
    pub fn render(&mut self, ctx: &CanvasRenderingContext2d) {
        self.ensure_layout(ctx);

        // Reset to the identity transform so we can clear the full backing
        // store, then fold in the device-pixel ratio and camera.
        let _ = ctx.set_transform(1.0, 0.0, 0.0, 1.0, 0.0, 0.0);
        ctx.set_fill_style_str(COL_BG);
        ctx.fill_rect(0.0, 0.0, self.width * self.dpr, self.height * self.dpr);

        ctx.scale(self.dpr, self.dpr).ok();
        ctx.translate(self.cam_x, self.cam_y).ok();
        ctx.scale(self.scale, self.scale).ok();

        let view = self.viewport();
        let detail = if self.scale < 0.5 {
            Detail::Compact
        } else {
            Detail::Full
        };

        self.draw_grid(ctx, view);
        self.draw_frames(ctx, view);
        self.draw_relations(ctx, view);

        // Тень — гауссово размытие на карточку, самая дорогая примитива здесь.
        // Пока сцену тянут, кадры идут подряд и разница незаметна, поэтому в
        // движении тени нет, а в покое она возвращается одной перерисовкой.
        let shadows = !self.is_interacting();
        for (i, table) in self.tables.iter().enumerate() {
            if !view.hits(table.x, table.y, table.w, table.height()) {
                continue;
            }
            draw_table(ctx, table, self.selected == Some(i), detail, shadows);
        }

        // Editing overlays sit above the tables.
        self.draw_ports(ctx);
        self.draw_link_preview(ctx);
        self.draw_delete_badge(ctx);
        self.draw_frame_handles(ctx);
        self.draw_draft(ctx);
    }

    /// Computes each table's width from its text, once. Mutates `w` in place.
    fn ensure_layout(&mut self, ctx: &CanvasRenderingContext2d) {
        if self.laid_out {
            return;
        }
        for table in &mut self.tables {
            ctx.set_font(FONT_HEAD);
            let mut max = measure(ctx, &table.name);
            ctx.set_font(FONT_ROW);
            for col in &table.columns {
                max = max.max(measure(ctx, &col.name));
            }
            // Знак расхождения стоит у правого края — под него нужен запас,
            // иначе он ляжет на длинное имя колонки.
            let sign = if table.columns.iter().any(|c| c.status != DiffStatus::Same) {
                SIGN_W
            } else {
                0.0
            };
            table.w = (PAD_X + ICON_W + TEXT_GAP + max + sign + PAD_X).max(MIN_TABLE_W);
        }
        self.laid_out = true;
    }

    /// Dotted background grid, drawn across the visible world region.
    ///
    /// Шаг удваивается по мере отдаления, чтобы плотность точек **на экране**
    /// оставалась постоянной. С фиксированным мировым шагом число точек росло
    /// квадратично: на минимальном масштабе выходило под тридцать тысяч заливок
    /// за кадр — и все размером в треть пикселя, то есть невидимые.
    fn draw_grid(&self, ctx: &CanvasRenderingContext2d, view: Viewport) {
        const BASE: f64 = 28.0;
        /// Ниже этого расстояния между точками на экране сетка сливается в фон.
        const MIN_ON_SCREEN: f64 = 18.0;

        let mut step = BASE;
        while step * self.scale < MIN_ON_SCREEN {
            step *= 2.0;
        }

        // Точка держит свой экранный размер: мир под ней растянут масштабом.
        let dot = 1.5 / self.scale;

        ctx.set_fill_style_str(COL_GRID);
        let mut gx = (view.left / step).floor() * step;
        while gx < view.right {
            let mut gy = (view.top / step).floor() * step;
            while gy < view.bottom {
                ctx.fill_rect(gx, gy, dot, dot);
                gy += step;
            }
            gx += step;
        }
    }

    /// Слой областей: полупрозрачная заливка, рамка и подпись над верхней
    /// гранью.
    ///
    /// Подпись рисуется и на отдалении, где таблицы уже теряют строки колонок:
    /// там она единственное, по чему схему можно читать, и стоит она одну
    /// надпись на область.
    fn draw_frames(&self, ctx: &CanvasRenderingContext2d, view: Viewport) {
        ctx.set_font(FONT_FRAME);
        ctx.set_text_baseline("alphabetic");
        ctx.set_text_align("left");

        for (i, f) in self.frames.iter().enumerate() {
            // Полоса подписи торчит над верхней гранью — её тоже нельзя терять
            // у края экрана.
            if !view.hits(f.x, f.y - FRAME_TITLE_H, f.w, f.h + FRAME_TITLE_H) {
                continue;
            }
            let selected = self.selected_frame == Some(i);

            rounded_rect(ctx, f.x, f.y, f.w, f.h, FRAME_CORNER_R);
            ctx.set_fill_style_str(COL_FRAME_BG);
            ctx.fill();
            ctx.set_stroke_style_str(if selected {
                COL_BORDER_SEL
            } else {
                COL_FRAME_BORDER
            });
            ctx.set_line_width(if selected { 2.0 } else { 1.5 });
            ctx.stroke();

            if !f.title.is_empty() {
                ctx.set_fill_style_str(if selected {
                    COL_BORDER_SEL
                } else {
                    COL_FRAME_TITLE
                });
                let _ = ctx.fill_text(&f.title, f.x + 4.0, f.y - 7.0);
            }
        }
    }

    /// Ручки растягивания выделенной области. Размер держится экранным: в мире
    /// он делится на масштаб, иначе на отдалении ручка стала бы точкой, а
    /// вблизи — плашкой в пол-области.
    fn draw_frame_handles(&self, ctx: &CanvasRenderingContext2d) {
        let Some(f) = self.selected_frame.and_then(|i| self.frames.get(i)) else {
            return;
        };

        let r = HANDLE_R / self.scale;
        ctx.set_fill_style_str(COL_HANDLE_BG);
        ctx.set_stroke_style_str(COL_BORDER_SEL);
        ctx.set_line_width(1.5 / self.scale);
        for (_, hx, hy) in f.handles() {
            ctx.begin_path();
            ctx.rect(hx - r, hy - r, r * 2.0, r * 2.0);
            ctx.fill();
            ctx.stroke();
        }
    }

    /// Прямоугольник, который сейчас протягивают в режиме рисования. Рисуется
    /// поверх всего: пока его тянут, важно только то, куда встанет область.
    fn draw_draft(&self, ctx: &CanvasRenderingContext2d) {
        let Some(draft) = &self.draft else {
            return;
        };

        let (x, y, w, h) = draft.rect();
        rounded_rect(ctx, x, y, w, h, FRAME_CORNER_R);
        ctx.set_fill_style_str(COL_FRAME_BG);
        ctx.fill();
        ctx.set_stroke_style_str(COL_BORDER_SEL);
        ctx.set_line_width(1.5 / self.scale);
        ctx.stroke();
    }

    /// Draws every relation as a bezier curve with crow's-foot endpoints. The
    /// selected relation is highlighted in the accent color.
    fn draw_relations(&self, ctx: &CanvasRenderingContext2d, view: Viewport) {
        for (i, rel) in self.relations.iter().enumerate() {
            let Some(c) = self.rel_curve(rel) else {
                continue;
            };
            // Кривая целиком лежит в прямоугольнике своих опорных точек, так
            // что его и хватает, чтобы отсечь связь за экраном.
            let (x0, x1) = (
                c.ax.min(c.bx).min(c.c1x).min(c.c2x),
                c.ax.max(c.bx).max(c.c1x).max(c.c2x),
            );
            let (y0, y1) = (c.ay.min(c.by), c.ay.max(c.by));
            if !view.hits(x0, y0, x1 - x0, y1 - y0) {
                continue;
            }
            let selected = self.selected_rel == Some(i);
            let status = status_colors(rel.status).map(|(line, _)| line);
            ctx.set_stroke_style_str(match (selected, status) {
                (true, _) => COL_REL_SEL,
                (false, Some(line)) => line,
                (false, None) => COL_REL,
            });
            ctx.set_line_width(if selected { 2.0 } else { 1.5 });
            // Связь, которой на диаграмме не рисовали, — пунктиром: её ещё нет
            // в документе, и выглядеть как нарисованная она не должна.
            if rel.status == DiffStatus::OnlyInDb {
                set_dash(ctx, &[6.0, 4.0]);
            }

            ctx.begin_path();
            ctx.move_to(c.ax, c.ay);
            ctx.bezier_curve_to(c.c1x, c.ay, c.c2x, c.by, c.bx, c.by);
            ctx.stroke();
            set_dash(ctx, &[]);

            draw_one(ctx, c.ax, c.ay, c.src_right);
            draw_many(ctx, c.bx, c.by, c.dst_right);
        }
    }

    /// Reveals the connection ports (left + right) on the hovered column row.
    fn draw_ports(&self, ctx: &CanvasRenderingContext2d) {
        let Some((ti, ci)) = self.hover_col else {
            return;
        };
        let Some(t) = self.tables.get(ti) else {
            return;
        };
        let cy = t.row_y(ci);
        ctx.set_line_width(1.5);
        for px in [t.x, t.x + t.w] {
            ctx.begin_path();
            let _ = ctx.arc(px, cy, PORT_R, 0.0, TAU);
            ctx.set_fill_style_str(COL_TABLE_BG);
            ctx.fill();
            ctx.set_stroke_style_str(COL_REL_SEL);
            ctx.stroke();
        }
    }

    /// Draws the live preview curve while a relation is being dragged out.
    fn draw_link_preview(&self, ctx: &CanvasRenderingContext2d) {
        let Some(link) = &self.link else {
            return;
        };
        let Some(t) = self.tables.get(link.from.0) else {
            return;
        };
        let ax = if link.from_right { t.x + t.w } else { t.x };
        let ay = t.row_y(link.from.1);
        let (bx, by) = link.cursor;
        let dx = ((bx - ax).abs() * 0.5).max(40.0);
        let c1x = ax + if link.from_right { dx } else { -dx };

        ctx.set_stroke_style_str(COL_REL_SEL);
        ctx.set_line_width(1.8);
        ctx.begin_path();
        ctx.move_to(ax, ay);
        ctx.bezier_curve_to(c1x, ay, bx, by, bx, by);
        ctx.stroke();

        // Source anchor dot.
        ctx.begin_path();
        let _ = ctx.arc(ax, ay, PORT_R, 0.0, TAU);
        ctx.set_fill_style_str(COL_REL_SEL);
        ctx.fill();
    }

    /// Draws the round ✕ delete badge at the midpoint of the selected relation.
    fn draw_delete_badge(&self, ctx: &CanvasRenderingContext2d) {
        let Some(ri) = self.selected_rel else {
            return;
        };
        let Some((mx, my)) = self
            .relations
            .get(ri)
            .and_then(|rel| self.rel_curve(rel))
            .map(|c| c.point(0.5))
        else {
            return;
        };

        ctx.begin_path();
        let _ = ctx.arc(mx, my, BADGE_R, 0.0, TAU);
        ctx.set_fill_style_str(COL_TABLE_BG);
        ctx.fill();
        ctx.set_stroke_style_str(COL_DELETE);
        ctx.set_line_width(1.5);
        ctx.stroke();

        let d = 3.5;
        ctx.begin_path();
        ctx.move_to(mx - d, my - d);
        ctx.line_to(mx + d, my + d);
        ctx.move_to(mx + d, my - d);
        ctx.line_to(mx - d, my + d);
        ctx.set_line_width(1.6);
        ctx.stroke();
    }
}

impl Default for Scene {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Free drawing helpers (no `&self` borrow, so they compose freely in loops).
// ---------------------------------------------------------------------------

/// Ключ сопоставления имён: сравнение приходит с бэкенда в той же свёртке —
/// PostgreSQL приводит незакавыченные имена к нижнему регистру, а в документе
/// имя пишет человек.
fn fold(name: &str) -> String {
    name.trim().to_lowercase()
}

/// Пунктир для того, чего в документе нет. Пустой образец возвращает сплошную
/// линию — чистить обязательно, иначе пунктир достанется следующей фигуре.
fn set_dash(ctx: &CanvasRenderingContext2d, pattern: &[f64]) {
    let dashes = js_sys::Array::new();
    for step in pattern {
        dashes.push(&JsValue::from_f64(*step));
    }
    let _ = ctx.set_line_dash(&dashes);
}

/// Цвета статуса: рамка/текст и заливка шапки. `None` — статус обычный, красить
/// нечем.
fn status_colors(status: DiffStatus) -> Option<(&'static str, &'static str)> {
    match status {
        DiffStatus::Same => None,
        DiffStatus::OnlyInDoc => Some((COL_DOC_ONLY, COL_DOC_ONLY_BG)),
        DiffStatus::OnlyInDb => Some((COL_DB_ONLY, COL_DB_ONLY_BG)),
        DiffStatus::Differs => Some((COL_DIFFERS, COL_DIFFERS_BG)),
    }
}

/// Знак у правого края строки — тот же смысл, что и цвет, но виден и без него.
fn status_sign(status: DiffStatus) -> Option<&'static str> {
    match status {
        DiffStatus::Same => None,
        DiffStatus::OnlyInDoc => Some("−"),
        DiffStatus::OnlyInDb => Some("+"),
        DiffStatus::Differs => Some("≠"),
    }
}

fn measure(ctx: &CanvasRenderingContext2d, text: &str) -> f64 {
    ctx.measure_text(text).map(|m| m.width()).unwrap_or(0.0)
}

/// Shortest distance from point `(px, py)` to the segment `a`–`b`.
fn dist_to_segment(px: f64, py: f64, a: (f64, f64), b: (f64, f64)) -> f64 {
    let (ax, ay) = a;
    let (bx, by) = b;
    let (dx, dy) = (bx - ax, by - ay);
    let len_sq = dx * dx + dy * dy;
    let t = if len_sq <= f64::EPSILON {
        0.0
    } else {
        (((px - ax) * dx + (py - ay) * dy) / len_sq).clamp(0.0, 1.0)
    };
    let (cx, cy) = (ax + t * dx, ay + t * dy);
    ((px - cx).powi(2) + (py - cy).powi(2)).sqrt()
}

/// Traces a rounded rectangle path (does not stroke or fill).
fn rounded_rect(ctx: &CanvasRenderingContext2d, x: f64, y: f64, w: f64, h: f64, r: f64) {
    ctx.begin_path();
    ctx.move_to(x + r, y);
    let _ = ctx.arc_to(x + w, y, x + w, y + h, r);
    let _ = ctx.arc_to(x + w, y + h, x, y + h, r);
    let _ = ctx.arc_to(x, y + h, x, y, r);
    let _ = ctx.arc_to(x, y, x + w, y, r);
    ctx.close_path();
}

/// Traces a rectangle path rounded only on the top two corners.
fn rounded_top(ctx: &CanvasRenderingContext2d, x: f64, y: f64, w: f64, h: f64, r: f64) {
    ctx.begin_path();
    ctx.move_to(x, y + h);
    ctx.line_to(x, y + r);
    let _ = ctx.arc_to(x, y, x + r, y, r);
    ctx.line_to(x + w - r, y);
    let _ = ctx.arc_to(x + w, y, x + w, y + r, r);
    ctx.line_to(x + w, y + h);
    ctx.close_path();
}

fn draw_table(
    ctx: &CanvasRenderingContext2d,
    t: &Table,
    selected: bool,
    detail: Detail,
    shadow: bool,
) {
    let h = t.height();
    let status = status_colors(t.status);
    // Таблицы, которой нет в документе, на холсте ещё не существует — она и
    // рисуется как набросок: пунктиром и без тени карточки.
    let ghost = t.status == DiffStatus::OnlyInDb;

    // Body — drawn with a soft drop shadow so surfaces read as cards on the
    // light canvas (mirrors --shadow-sm). The shadow is cleared immediately
    // afterwards so nothing else inherits it.
    if shadow && !ghost {
        ctx.set_shadow_color(COL_SHADOW);
        ctx.set_shadow_blur(12.0);
        ctx.set_shadow_offset_x(0.0);
        ctx.set_shadow_offset_y(3.0);
    }
    rounded_rect(ctx, t.x, t.y, t.w, h, CORNER_R);
    ctx.set_fill_style_str(COL_TABLE_BG);
    ctx.fill();
    if shadow && !ghost {
        ctx.set_shadow_color("rgba(0, 0, 0, 0)");
        ctx.set_shadow_blur(0.0);
        ctx.set_shadow_offset_y(0.0);
    }

    // Header band. Её заливка и несёт статус таблицы: рамку может перекрыть
    // выделение, а шапка видна всегда.
    rounded_top(ctx, t.x, t.y, t.w, HEADER_H, CORNER_R);
    ctx.set_fill_style_str(match status {
        Some((_, bg)) => bg,
        None => COL_HEADER_BG,
    });
    ctx.fill();

    // Header: table glyph + name.
    draw_table_glyph(ctx, t.x + PAD_X + ICON_W * 0.5, t.y + HEADER_H * 0.5);
    ctx.set_font(FONT_HEAD);
    ctx.set_text_baseline("middle");
    ctx.set_text_align("left");
    ctx.set_fill_style_str(COL_TEXT_HEAD);
    let _ = ctx.fill_text(
        &t.name,
        t.x + PAD_X + ICON_W + TEXT_GAP,
        t.y + HEADER_H * 0.5 + 1.0,
    );

    // Column rows. На отдалении их не рисуем: имя колонки там всё равно
    // нечитаемо, а строки — самая дорогая часть кадра. Высота таблицы при этом
    // не меняется, поэтому связи приходят туда же, куда и при полном рисовании.
    if detail == Detail::Full {
        ctx.set_font(FONT_ROW);
        for (i, col) in t.columns.iter().enumerate() {
            let cy = t.row_y(i);
            let icon_cx = t.x + PAD_X + ICON_W * 0.5;
            draw_col_icon(ctx, col.kind, icon_cx, cy);

            let tone = match status_colors(col.status) {
                Some((line, _)) => line,
                None => match col.kind {
                    ColKind::Nullable => COL_TEXT_DIM,
                    _ => COL_TEXT,
                },
            };
            ctx.set_fill_style_str(tone);
            let _ = ctx.fill_text(&col.name, t.x + PAD_X + ICON_W + TEXT_GAP, cy + 1.0);

            if let Some(sign) = status_sign(col.status) {
                ctx.set_text_align("right");
                let _ = ctx.fill_text(sign, t.x + t.w - PAD_X, cy + 1.0);
                ctx.set_text_align("left");
            }
        }
    }

    // Border (drawn last so it sits on top of the fills).
    rounded_rect(ctx, t.x, t.y, t.w, h, CORNER_R);
    ctx.set_stroke_style_str(match (selected, status) {
        (true, _) => COL_BORDER_SEL,
        (false, Some((line, _))) => line,
        (false, None) => COL_BORDER,
    });
    ctx.set_line_width(if selected || status.is_some() {
        2.0
    } else {
        1.0
    });
    if ghost {
        set_dash(ctx, &[6.0, 4.0]);
    }
    ctx.stroke();
    set_dash(ctx, &[]);
}

/// A small "table" glyph for the header: an outlined box with a top stripe.
fn draw_table_glyph(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64) {
    ctx.set_stroke_style_str(COL_TEXT_DIM);
    ctx.set_line_width(1.2);
    ctx.stroke_rect(cx - 6.0, cy - 6.0, 12.0, 12.0);
    ctx.begin_path();
    ctx.move_to(cx - 6.0, cy - 1.5);
    ctx.line_to(cx + 6.0, cy - 1.5);
    ctx.stroke();
}

fn draw_col_icon(ctx: &CanvasRenderingContext2d, kind: ColKind, cx: f64, cy: f64) {
    match kind {
        ColKind::Pk => draw_key(ctx, cx, cy),
        ColKind::Fk => draw_link(ctx, cx, cy),
        ColKind::Plain => draw_diamond(ctx, cx, cy, true),
        ColKind::Nullable => draw_diamond(ctx, cx, cy, false),
    }
}

fn draw_diamond(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, filled: bool) {
    let r = 4.0;
    ctx.begin_path();
    ctx.move_to(cx, cy - r);
    ctx.line_to(cx + r, cy);
    ctx.line_to(cx, cy + r);
    ctx.line_to(cx - r, cy);
    ctx.close_path();
    if filled {
        ctx.set_fill_style_str(COL_TEXT_DIM);
        ctx.fill();
    } else {
        ctx.set_stroke_style_str(COL_TEXT_DIM);
        ctx.set_line_width(1.2);
        ctx.stroke();
    }
}

fn draw_key(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64) {
    ctx.set_stroke_style_str(COL_KEY);
    ctx.set_line_width(1.4);
    // Ring.
    ctx.begin_path();
    let _ = ctx.arc(cx - 2.5, cy, 3.0, 0.0, std::f64::consts::PI * 2.0);
    ctx.stroke();
    // Shaft with a tooth.
    ctx.begin_path();
    ctx.move_to(cx + 0.4, cy);
    ctx.line_to(cx + 5.5, cy);
    ctx.move_to(cx + 5.5, cy);
    ctx.line_to(cx + 5.5, cy + 3.0);
    ctx.stroke();
}

fn draw_link(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64) {
    ctx.set_stroke_style_str(COL_KEY);
    ctx.set_line_width(1.4);
    ctx.begin_path();
    let _ = ctx.arc(cx - 2.0, cy, 2.6, 0.0, std::f64::consts::PI * 2.0);
    ctx.stroke();
    ctx.begin_path();
    let _ = ctx.arc(cx + 2.0, cy, 2.6, 0.0, std::f64::consts::PI * 2.0);
    ctx.stroke();
}

/// The "one" endpoint: a single perpendicular bar set a little off the table.
fn draw_one(ctx: &CanvasRenderingContext2d, ax: f64, ay: f64, out_right: bool) {
    let d = if out_right { 12.0 } else { -12.0 };
    let bx = ax + d;
    ctx.begin_path();
    ctx.move_to(bx, ay - 6.0);
    ctx.line_to(bx, ay + 6.0);
    ctx.stroke();
}

/// The "many" endpoint: a crow's foot whose prongs touch the table edge and
/// converge to a point set off the table.
fn draw_many(ctx: &CanvasRenderingContext2d, ax: f64, ay: f64, out_right: bool) {
    let d = if out_right { 14.0 } else { -14.0 };
    let bx = ax + d;
    ctx.begin_path();
    ctx.move_to(bx, ay);
    ctx.line_to(ax, ay - 6.0);
    ctx.move_to(bx, ay);
    ctx.line_to(ax, ay);
    ctx.move_to(bx, ay);
    ctx.line_to(ax, ay + 6.0);
    ctx.stroke();
}

// ---------------------------------------------------------------------------
// Sample data resembling the reference screenshot.
// ---------------------------------------------------------------------------

impl Scene {
    fn seed_sample(&mut self) {
        use ColKind::*;

        fn col(name: &str, kind: ColKind) -> Column {
            // Иконку демо-схема задаёт сама: внешний ключ из флагов колонки не
            // выводится, его знают только связи.
            let mut column = Column::new(name.to_string(), kind == Pk, kind == Nullable);
            column.kind = kind;
            column
        }

        self.tables = vec![
            Table::new(
                "",
                "accounts",
                vec![
                    col("id", Pk),
                    col("archived_at", Nullable),
                    col("created_at", Plain),
                    col("locale", Plain),
                    col("name", Plain),
                    col("timezone", Plain),
                    col("updated_at", Plain),
                    col("uuid", Plain),
                ],
                60.0,
                60.0,
            ),
            Table::new(
                "",
                "account_accesses",
                vec![
                    col("id", Pk),
                    col("account_id", Fk),
                    col("created_at", Plain),
                    col("updated_at", Plain),
                    col("user_id", Fk),
                ],
                420.0,
                60.0,
            ),
            Table::new(
                "",
                "email_messages",
                vec![
                    col("id", Pk),
                    col("account_id", Fk),
                    col("author_id", Fk),
                    col("body", Plain),
                    col("created_at", Plain),
                    col("sha1", Plain),
                    col("subject", Plain),
                    col("updated_at", Plain),
                    col("uuid", Plain),
                ],
                780.0,
                40.0,
            ),
            Table::new(
                "",
                "account_configs",
                vec![
                    col("id", Pk),
                    col("account_id", Fk),
                    col("created_at", Plain),
                    col("key", Plain),
                    col("updated_at", Plain),
                    col("value", Plain),
                ],
                420.0,
                320.0,
            ),
            Table::new(
                "",
                "oauth_applications",
                vec![
                    col("id", Pk),
                    col("confidential", Plain),
                    col("created_at", Plain),
                    col("name", Plain),
                    col("redirect_uri", Nullable),
                    col("scopes", Plain),
                ],
                60.0,
                400.0,
            ),
            Table::new(
                "",
                "access_tokens",
                vec![
                    col("id", Pk),
                    col("created_at", Plain),
                    col("sha256", Plain),
                    col("token", Plain),
                    col("updated_at", Plain),
                ],
                780.0,
                440.0,
            ),
        ];

        // (table_index, column_index) pairs: primary-key side -> foreign-key side.
        self.doc_tables = self.tables.len();
        self.relations = vec![
            Relation::new((0, 0), (1, 1)), // accounts.id -> account_accesses.account_id
            Relation::new((0, 0), (2, 1)), // accounts.id -> email_messages.account_id
            Relation::new((0, 0), (3, 1)), // accounts.id -> account_configs.account_id
            Relation::new((1, 0), (2, 2)), // account_accesses.id -> email_messages.author_id
            Relation::new((4, 0), (5, 0)), // oauth_applications.id -> access_tokens.id
        ];
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Сцена с одной таблицей в трёх колонках — ровно то, что нужно связи
    /// таблицы с самой собой.
    fn scene_with_one_table() -> Scene {
        let mut scene = Scene::new();
        scene.tables = vec![Table::new(
            "t1",
            "catalog_node",
            vec![
                Column::new("id".to_string(), true, false),
                Column::new("name".to_string(), false, false),
                Column::new("parent_id".to_string(), false, true),
            ],
            100.0,
            200.0,
        )];
        scene.tables[0].w = 180.0;
        scene.relations = vec![Relation::new((0, 0), (0, 2))];
        scene
    }

    /// `parent_id → id` есть едва ли не в каждой схеме. Петля рисуется у правой
    /// грани и выгибается наружу — иначе она прошла бы сквозь саму таблицу.
    #[test]
    fn a_self_relation_loops_out_of_the_right_edge() {
        let scene = scene_with_one_table();
        let table = &scene.tables[0];

        let curve = scene
            .rel_curve(&scene.relations[0])
            .expect("петля не построилась");

        assert_eq!(curve.ax, table.x + table.w, "опора на правой грани");
        assert_eq!(curve.bx, curve.ax, "обе опоры на одной грани");
        assert!(curve.c1x > curve.ax && curve.c2x > curve.ax);
        assert!(
            curve.src_right && curve.dst_right,
            "оба конца смотрят вправо"
        );
        assert_ne!(curve.ay, curve.by, "опоры на разных строках");

        let (mx, _) = curve.point(0.5);
        assert!(
            mx > table.x + table.w,
            "середина петли должна лежать снаружи таблицы: {mx}"
        );
    }

    /// Соседние строки не должны схлопывать петлю в плоский штрих.
    #[test]
    fn a_loop_between_neighbouring_rows_still_bulges() {
        let mut scene = scene_with_one_table();
        scene.relations = vec![Relation::new((0, 0), (0, 1))];

        let curve = scene.rel_curve(&scene.relations[0]).unwrap();

        assert!(
            curve.c1x - curve.ax >= 56.0,
            "вынос петли слишком мал: {}",
            curve.c1x - curve.ax
        );
    }

    // -----------------------------------------------------------------------
    // Сравнение с живой базой
    // -----------------------------------------------------------------------

    /// Диаграмма из одной таблицы `users` с колонкой `id`.
    fn scene_with_users() -> Scene {
        let mut scene = Scene::new();
        scene.tables = vec![Table::new(
            "e1",
            "users",
            vec![Column::new("id".to_string(), true, false)],
            100.0,
            100.0,
        )];
        scene.tables[0].w = 180.0;
        scene.doc_tables = 1;
        scene.relations.clear();
        scene
    }

    fn column(name: &str, status: &str) -> ColumnDiffDTO {
        ColumnDiffDTO {
            name: name.to_string(),
            status: status.to_string(),
            pk: name == "id",
            nullable: false,
        }
    }

    /// Ровно то, ради чего всё затевалось: таблица, известная обеим сторонам,
    /// остаётся на холсте одна.
    #[test]
    fn a_table_known_to_both_sides_is_not_drawn_twice() {
        let mut scene = scene_with_users();

        scene.apply_diff(DiffDTO {
            tables: vec![
                TableDiffDTO {
                    id: Some("e1".into()),
                    name: "users".into(),
                    status: "same".into(),
                    x: None,
                    y: None,
                    columns: vec![column("id", "same")],
                },
                TableDiffDTO {
                    id: None,
                    name: "orders".into(),
                    status: "onlyInDb".into(),
                    x: Some(400.0),
                    y: Some(100.0),
                    columns: vec![column("id", "onlyInDb")],
                },
            ],
            relations: vec![],
        });

        assert_eq!(scene.tables.len(), 2, "одна своя и одна из базы");
        assert_eq!(scene.tables[0].id, "e1");
        assert_eq!(scene.tables[0].status, DiffStatus::Same);
        assert_eq!(scene.tables[1].name, "orders");
        assert_eq!(scene.tables[1].status, DiffStatus::OnlyInDb);
        assert_eq!((scene.tables[1].x, scene.tables[1].y), (400.0, 100.0));
        assert!(scene.is_comparing());
    }

    /// Колонка, которой в документе нет, дописывается в ту же таблицу, а не
    /// заводит вторую.
    #[test]
    fn a_column_only_the_database_has_joins_the_table_it_belongs_to() {
        let mut scene = scene_with_users();

        scene.apply_diff(DiffDTO {
            tables: vec![TableDiffDTO {
                id: Some("e1".into()),
                name: "users".into(),
                status: "differs".into(),
                x: None,
                y: None,
                columns: vec![column("id", "same"), column("email", "onlyInDb")],
            }],
            relations: vec![],
        });

        let table = &scene.tables[0];
        assert_eq!(table.columns.len(), 2);
        assert_eq!(table.columns[1].name, "email");
        assert_eq!(table.columns[1].status, DiffStatus::OnlyInDb);
        assert_eq!(table.doc_cols, 1, "своя у таблицы по-прежнему одна");
    }

    /// Внешний ключ, который есть в базе и не нарисован, появляется на холсте
    /// связью — но связью помеченной.
    #[test]
    fn a_foreign_key_the_diagram_lacks_is_drawn_too() {
        let mut scene = scene_with_users();

        scene.apply_diff(DiffDTO {
            tables: vec![
                TableDiffDTO {
                    id: Some("e1".into()),
                    name: "users".into(),
                    status: "same".into(),
                    x: None,
                    y: None,
                    columns: vec![column("id", "same")],
                },
                TableDiffDTO {
                    id: None,
                    name: "orders".into(),
                    status: "onlyInDb".into(),
                    x: Some(400.0),
                    y: Some(100.0),
                    columns: vec![column("user_id", "onlyInDb")],
                },
            ],
            relations: vec![RelationDiffDTO {
                status: "onlyInDb".into(),
                from_table: "users".into(),
                from_column: "id".into(),
                to_table: "orders".into(),
                to_column: "user_id".into(),
            }],
        });

        assert_eq!(scene.relations.len(), 1);
        assert_eq!(scene.relations[0].status, DiffStatus::OnlyInDb);
        assert_eq!(scene.relations[0].from, (0, 0));
        assert_eq!(scene.relations[0].to, (1, 0));
    }

    /// Таблицу из базы нельзя ни сохранить, ни связать: id ей взять неоткуда.
    #[test]
    fn a_table_that_exists_only_in_the_database_cannot_be_linked_or_saved() {
        let mut scene = scene_with_users();
        scene.apply_diff(DiffDTO {
            tables: vec![TableDiffDTO {
                id: None,
                name: "orders".into(),
                status: "onlyInDb".into(),
                x: Some(400.0),
                y: Some(100.0),
                columns: vec![column("id", "onlyInDb")],
            }],
            relations: vec![],
        });

        // Ширину таблице считает первый кадр по отрисованному тексту, а
        // канваса в тесте нет — без неё в призрака не попасть мышью.
        scene.tables[1].w = 180.0;

        let (gx, gy) = (scene.tables[1].x, scene.tables[1].y);
        let py = scene.tables[1].row_y(0);
        assert!(scene.hit_port(gx, py).is_none(), "портов у призрака нет");

        // Тянем призрака и отпускаем: на холсте он поедет, в базу не поедет.
        scene.on_mouse_down(gx + 20.0, gy + 10.0);
        scene.on_mouse_move(gx + 60.0, gy + 10.0);
        scene.on_mouse_up(gx + 60.0, gy + 10.0);

        assert!(
            scene.pending_moves.is_empty(),
            "позицию призрака сохранять некуда"
        );
        assert_eq!(scene.selected_ghost_name().as_deref(), Some("orders"));
        assert!(
            scene.selected_id().is_none(),
            "форму правки призрак не открывает"
        );
    }

    /// Выход из сравнения возвращает холст к тому, что лежит в документе.
    #[test]
    fn leaving_the_comparison_takes_the_database_side_with_it() {
        let mut scene = scene_with_users();
        scene.apply_diff(DiffDTO {
            tables: vec![
                TableDiffDTO {
                    id: Some("e1".into()),
                    name: "users".into(),
                    status: "differs".into(),
                    x: None,
                    y: None,
                    columns: vec![column("id", "same"), column("email", "onlyInDb")],
                },
                TableDiffDTO {
                    id: None,
                    name: "orders".into(),
                    status: "onlyInDb".into(),
                    x: Some(400.0),
                    y: Some(100.0),
                    columns: vec![column("user_id", "onlyInDb")],
                },
            ],
            relations: vec![RelationDiffDTO {
                status: "onlyInDb".into(),
                from_table: "users".into(),
                from_column: "id".into(),
                to_table: "orders".into(),
                to_column: "user_id".into(),
            }],
        });

        scene.clear_diff();

        assert!(!scene.is_comparing());
        assert_eq!(scene.tables.len(), 1);
        assert_eq!(scene.tables[0].columns.len(), 1);
        assert_eq!(scene.tables[0].status, DiffStatus::Same);
        assert_eq!(scene.tables[0].columns[0].status, DiffStatus::Same);
        assert!(
            scene.relations.is_empty(),
            "дорисованная связь уходит с призраком"
        );
    }

    /// Сцена с областью, одной таблицей внутри неё и одной рядом.
    fn scene_with_a_frame() -> Scene {
        let mut scene = Scene::new();
        scene.tables = vec![
            Table::new(
                "inside",
                "invoice",
                vec![Column::new("id".to_string(), true, false)],
                140.0,
                160.0,
            ),
            Table::new(
                "outside",
                "audit_log",
                vec![Column::new("id".to_string(), true, false)],
                700.0,
                160.0,
            ),
        ];
        for t in &mut scene.tables {
            t.w = 180.0;
        }
        scene.relations.clear();
        scene.frames = vec![Frame::new("f1", "Биллинг", 100.0, 100.0, 400.0, 300.0)];
        scene
    }

    /// Группировка и держится на этом: область едет вместе с тем, что на ней
    /// лежит, а соседняя таблица остаётся на месте.
    #[test]
    fn a_frame_carries_the_tables_that_lie_inside_it() {
        let mut scene = scene_with_a_frame();
        let grab_y = 100.0 - FRAME_TITLE_H * 0.5;

        scene.on_mouse_down(120.0, grab_y);
        assert!(scene.frame_drag.is_some(), "область берётся за подпись");
        scene.on_mouse_move(170.0, grab_y + 25.0);
        scene.on_mouse_up(170.0, grab_y + 25.0);

        assert_eq!((scene.frames[0].x, scene.frames[0].y), (150.0, 125.0));
        assert_eq!((scene.tables[0].x, scene.tables[0].y), (190.0, 185.0));
        assert_eq!(
            (scene.tables[1].x, scene.tables[1].y),
            (700.0, 160.0),
            "таблица снаружи области не сдвигается"
        );
        assert_eq!(
            scene.pending_frames.len(),
            1,
            "границы области уходят на запись"
        );
        assert_eq!(scene.pending_moves.len(), 1);
        assert_eq!(scene.pending_moves[0].id, "inside");
    }

    /// Таблица рисуется поверх области — и клик достаётся ей же, иначе таблицу
    /// на области нельзя было бы ни выделить, ни подвинуть.
    #[test]
    fn a_table_lying_on_a_frame_still_takes_the_click() {
        let mut scene = scene_with_a_frame();
        let (x, y) = (scene.tables[0].x + 40.0, scene.tables[0].y + 10.0);

        scene.on_mouse_down(x, y);

        assert!(scene.drag.is_some(), "тянется таблица");
        assert!(scene.frame_drag.is_none(), "а не область под ней");
        assert_eq!(scene.selected, Some(0));
        assert_eq!(scene.selected_frame, None);
    }

    /// По телу области холст панорамируется: иначе область в пол-экрана отняла
    /// бы у холста пан.
    #[test]
    fn a_frames_body_selects_it_but_pans_the_canvas() {
        let mut scene = scene_with_a_frame();

        scene.on_mouse_down(450.0, 350.0);

        assert_eq!(scene.selected_frame, Some(0), "область выделяется");
        assert!(scene.pan.is_some(), "и холст при этом панорамируется");
        assert!(scene.frame_drag.is_none());
    }

    /// Грань упирается, не доходя до противоположной.
    #[test]
    fn a_frame_cannot_be_squeezed_below_its_minimum() {
        let mut scene = scene_with_a_frame();
        scene.selected_frame = Some(0);

        scene.on_mouse_down(100.0, 250.0);
        assert!(scene.frame_resize.is_some(), "середина левой грани — ручка");
        scene.on_mouse_move(480.0, 250.0);
        scene.on_mouse_up(480.0, 250.0);

        assert_eq!(scene.frames[0].w, FRAME_MIN_W);
        assert_eq!(
            scene.frames[0].x,
            500.0 - FRAME_MIN_W,
            "правая грань остаётся на месте"
        );
        assert_eq!(scene.pending_frames.len(), 1);
    }

    /// Сцена не заводит область сама: id выдаёт база, и до ответа команды на
    /// холсте лежит только черновик.
    #[test]
    fn a_drawn_rectangle_waits_for_js_to_turn_it_into_a_frame() {
        let mut scene = Scene::new();
        scene.begin_draw_frame();

        scene.on_mouse_down(200.0, 150.0);
        scene.on_mouse_move(600.0, 450.0);
        scene.on_mouse_up(600.0, 450.0);

        assert!(!scene.is_drawing(), "режим рисования гаснет сам");
        assert!(scene.frames.is_empty());
        let draft = scene.draft_done.as_ref().expect("черновик не сохранился");
        assert_eq!(
            (draft.x, draft.y, draft.w, draft.h),
            (200.0, 150.0, 400.0, 300.0)
        );
    }

    /// Одиночный клик в режиме рисования — промах, а не область в пиксель.
    #[test]
    fn a_click_in_drawing_mode_draws_nothing() {
        let mut scene = Scene::new();
        scene.begin_draw_frame();

        scene.on_mouse_down(200.0, 150.0);
        scene.on_mouse_up(200.0, 150.0);

        assert!(scene.draft_done.is_none());
        assert!(!scene.is_drawing());
    }

    /// Связь колонки с самой собой ничего не описывает: такую сцена не заводит.
    #[test]
    fn a_column_cannot_be_linked_to_itself() {
        let mut scene = scene_with_one_table();
        scene.relations.clear();
        scene.link = Some(LinkState {
            from: (0, 2),
            from_right: true,
            cursor: (0.0, 0.0),
        });

        // Отпускаем ровно на той же строке, из которой тянули.
        let table = &scene.tables[0];
        let (x, y) = (table.x + 10.0, table.row_y(2));
        scene.on_mouse_up(x * scene.scale + scene.cam_x, y * scene.scale + scene.cam_y);

        assert!(
            scene.relations.is_empty(),
            "петля колонки на себя не заводится"
        );
        assert!(scene.pending_links.is_empty());
    }
}
