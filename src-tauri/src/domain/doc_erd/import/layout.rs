//! Раскладка таблиц на ERD-холсте.
//!
//! Чистая геометрия: на вход — что уже расставлено, что нужно расставить и
//! какие между ними связи, на выход — координаты для нерасставленных. Ни базы,
//! ни канваса здесь нет, поэтому раскладка проверяется тестами целиком.
//!
//! Критерий «связь читается» задан отрисовкой (`wasm/crates/canvas`): кривая
//! выходит из левой или правой грани таблицы, сторона выбирается по тому, чей
//! центр левее, а контрольные точки уходят по горизонтали. Значит связь читается,
//! когда таблицы стоят бок о бок по горизонтали, сторона первичного ключа слева,
//! внешнего — справа, и между ними никого нет. Отсюда и раскладка: слои слева
//! направо по связям, внутри слоя — стопка.
//!
//! Уже расставленные таблицы не двигаются никогда: раскладка — работа
//! пользователя, а импорт приносит только то, чего на холсте ещё нет.

/// Геометрия таблицы повторяет `domain/table/model.rs` в канвас-крейте.
const HEADER_H: f64 = 38.0;
const ROW_H: f64 = 30.0;
const MIN_W: f64 = 170.0;
/// Поля, иконка ключа и просвет между ней и текстом — всё, что в ширине
/// таблицы занято не текстом (`PAD_X * 2 + ICON_W + TEXT_GAP`).
const CHROME_W: f64 = 54.0;
/// Оценка ширины символа. Настоящую ширину канвас меряет по отрисованному
/// тексту при первом кадре, но для расстановки хватает и оценки: она уточняет
/// ширину таблицы, а не её угол.
const CHAR_W: f64 = 7.8;

/// Просвет между слоями. Кривая связи уходит в сторону минимум на 40 —
/// в более узкую щель она не поместится и пойдёт поверх таблиц.
const GUTTER: f64 = 90.0;
/// Просвет между таблицами, стоящими друг под другом.
const GAP_Y: f64 = 40.0;
/// Отступ от левого верхнего угла холста.
const ORIGIN: f64 = 40.0;
/// Высота, после которой столбец несвязанных таблиц переносится вправо, —
/// иначе диаграмма без связей вытянулась бы в бесконечную колонку.
const COLUMN_H: f64 = 900.0;

/// Таблица, которая уже стоит на холсте. Её место — данность.
#[derive(Debug, Clone)]
pub struct FixedTable {
    pub name: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

/// Таблица, которой нужно найти место.
#[derive(Debug, Clone)]
pub struct FreeTable {
    pub name: String,
    pub w: f64,
    pub h: f64,
}

/// Связь между таблицами по именам: `from` — сторона первичного ключа,
/// `to` — внешнего. Направление задаёт порядок слоёв.
#[derive(Debug, Clone)]
pub struct Edge {
    pub from: String,
    pub to: String,
}

/// Размер таблицы по её содержимому: высота — по числу колонок, ширина — по
/// самой длинной подписи.
pub fn size_of(name: &str, columns: &[&str]) -> (f64, f64) {
    let longest = columns
        .iter()
        .map(|column| column.chars().count())
        .chain(std::iter::once(name.chars().count()))
        .max()
        .unwrap_or(0);

    let w = (CHROME_W + longest as f64 * CHAR_W).max(MIN_W);
    let h = HEADER_H + columns.len() as f64 * ROW_H;

    (w, h)
}

#[derive(Debug, Clone, Copy)]
struct Rect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

impl Rect {
    fn overlaps(&self, other: &Rect) -> bool {
        self.x < other.x + other.w + GUTTER * 0.5
            && other.x < self.x + self.w + GUTTER * 0.5
            && self.y < other.y + other.h + GAP_Y * 0.5
            && other.y < self.y + self.h + GAP_Y * 0.5
    }
}

/// Расставляет свободные таблицы. Результат идёт в том же порядке, что `free`.
///
/// Таблицы, связанные друг с другом, раскладываются слоями и ставятся группой;
/// группа, у которой есть связь с уже стоящей таблицей, встаёт рядом с ней —
/// потомок справа от неё, предок слева. Остальные группы пакуются столбцами в
/// свободном месте. Наложений не остаётся: занятые прямоугольники копятся по
/// ходу, и группа съезжает вниз, пока не встанет чисто.
pub fn place(fixed: &[FixedTable], free: &[FreeTable], edges: &[Edge]) -> Vec<(f64, f64)> {
    if free.is_empty() {
        return Vec::new();
    }

    let index = |name: &str| free.iter().position(|table| table.name == name);

    // Связи между свободными таблицами задают слои внутри группы, связи со
    // стоящими — место самой группы.
    let mut links: Vec<(usize, usize)> = Vec::new();
    let mut anchors: Vec<(usize, &FixedTable, bool)> = Vec::new();
    for edge in edges {
        match (index(&edge.from), index(&edge.to)) {
            (Some(from), Some(to)) if from != to => links.push((from, to)),
            (Some(from), None) => {
                if let Some(anchor) = fixed.iter().find(|table| table.name == edge.to) {
                    // Свободная таблица — сторона первичного ключа: ей налево.
                    anchors.push((from, anchor, false));
                }
            }
            (None, Some(to)) => {
                if let Some(anchor) = fixed.iter().find(|table| table.name == edge.from) {
                    anchors.push((to, anchor, true));
                }
            }
            _ => {}
        }
    }

    let groups = components(free.len(), &links);

    let mut occupied: Vec<Rect> = fixed
        .iter()
        .map(|table| Rect {
            x: table.x,
            y: table.y,
            w: table.w,
            h: table.h,
        })
        .collect();

    let mut placed = vec![(0.0, 0.0); free.len()];

    // Сначала группы с якорями — они встают по месту, а не куда придётся.
    let mut order: Vec<usize> = (0..groups.len()).collect();
    order.sort_by_key(|&group| {
        let anchored = groups[group].iter().any(|&table| {
            anchors
                .iter()
                .any(|(free_table, _, _)| free_table == &table)
        });
        (!anchored, group)
    });

    // Курсор упаковки для групп без якорей: столбец за столбцом правее всего,
    // что уже занято.
    let mut cursor_x = occupied
        .iter()
        .map(|rect| rect.x + rect.w)
        .fold(f64::NEG_INFINITY, f64::max);
    cursor_x = if cursor_x.is_finite() {
        cursor_x + GUTTER
    } else {
        ORIGIN
    };
    let mut cursor_y = ORIGIN;
    let mut column_w: f64 = 0.0;

    for group in order {
        let local = layered(&groups[group], free, &links);
        let width = local
            .iter()
            .map(|(table, x, _)| x + free[*table].w)
            .fold(0.0_f64, f64::max);
        let height = local
            .iter()
            .map(|(table, _, y)| y + free[*table].h)
            .fold(0.0_f64, f64::max);

        let (mut ox, oy) = match anchor_origin(&groups[group], &local, free, &anchors) {
            Some(origin) => origin,
            None => {
                // Столбец кончился — следующая группа начинает новый.
                if cursor_y > ORIGIN && cursor_y + height > COLUMN_H {
                    cursor_x += column_w + GUTTER;
                    cursor_y = ORIGIN;
                    column_w = 0.0;
                }
                let origin = (cursor_x, cursor_y);
                cursor_y += height + GAP_Y;
                column_w = column_w.max(width);
                origin
            }
        };

        // Съезжаем вниз, пока группа накрывает что-нибудь занятое. Шаг —
        // нижняя граница помехи, так что цикл сходится за считанные проходы.
        let mut oy = oy.max(ORIGIN);
        let mut guard = 0;
        while let Some(hit) = occupied.iter().find(|rect| {
            rect.overlaps(&Rect {
                x: ox,
                y: oy,
                w: width,
                h: height,
            })
        }) {
            oy = hit.y + hit.h + GAP_Y;
            guard += 1;
            if guard > free.len() + fixed.len() + 8 {
                // Свободного места по вертикали не нашлось — уводим группу
                // вправо, чем оставлять её поверх чужих таблиц.
                ox = occupied
                    .iter()
                    .map(|rect| rect.x + rect.w)
                    .fold(0.0_f64, f64::max)
                    + GUTTER;
                oy = ORIGIN;
                break;
            }
        }

        for (table, x, y) in local {
            placed[table] = (ox + x, oy + y);
            occupied.push(Rect {
                x: ox + x,
                y: oy + y,
                w: free[table].w,
                h: free[table].h,
            });
        }
    }

    placed
}

/// Угол группы, выведенный из её связей с уже стоящими таблицами: потомок
/// встаёт справа от предка, предок — слева от потомка, по вертикали группа
/// равняется на своих соседей. `None` — связей со стоящими нет.
fn anchor_origin(
    group: &[usize],
    local: &[(usize, f64, f64)],
    free: &[FreeTable],
    anchors: &[(usize, &FixedTable, bool)],
) -> Option<(f64, f64)> {
    let mut xs: Vec<f64> = Vec::new();
    let mut ys: Vec<f64> = Vec::new();

    for (table, anchor, to_the_right) in anchors {
        if !group.contains(table) {
            continue;
        }
        let (_, lx, ly) = local.iter().find(|(t, _, _)| t == table)?;

        // Слева от якоря таблица встаёт правым краем к нему, справа — левым.
        xs.push(if *to_the_right {
            anchor.x + anchor.w + GUTTER - lx
        } else {
            anchor.x - GUTTER - lx - free[*table].w
        });
        ys.push(anchor.y - ly);
    }

    if xs.is_empty() {
        return None;
    }

    // По горизонтали берём самый правый вариант: он гарантированно не
    // накрывает предка, ради которого группу сюда и ставят. По вертикали —
    // среднее, чтобы группа встала напротив своих соседей.
    let x = xs.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b));
    let y = ys.iter().sum::<f64>() / ys.len() as f64;

    Some((x.max(ORIGIN), y))
}

/// Связные группы свободных таблиц: связь внутри файла делает таблицы одной
/// картинкой, и разносить их по холсту нельзя.
fn components(count: usize, links: &[(usize, usize)]) -> Vec<Vec<usize>> {
    let mut parent: Vec<usize> = (0..count).collect();

    fn root(parent: &mut [usize], mut node: usize) -> usize {
        while parent[node] != node {
            parent[node] = parent[parent[node]];
            node = parent[node];
        }
        node
    }

    for (a, b) in links {
        let (ra, rb) = (root(&mut parent, *a), root(&mut parent, *b));
        if ra != rb {
            parent[ra] = rb;
        }
    }

    let mut groups: Vec<Vec<usize>> = Vec::new();
    let mut of_root: Vec<Option<usize>> = vec![None; count];
    for node in 0..count {
        let r = root(&mut parent, node);
        match of_root[r] {
            Some(group) => groups[group].push(node),
            None => {
                of_root[r] = Some(groups.len());
                groups.push(vec![node]);
            }
        }
    }

    groups
}

/// Раскладка одной группы: слои слева направо по связям, внутри слоя — стопка.
/// Координаты локальные, от угла группы.
fn layered(
    group: &[usize],
    free: &[FreeTable],
    links: &[(usize, usize)],
) -> Vec<(usize, f64, f64)> {
    let inside: Vec<(usize, usize)> = links
        .iter()
        .filter(|(a, b)| group.contains(a) && group.contains(b))
        .copied()
        .collect();

    // Слой — длиннейший путь по связям. Релаксация ограничена числом таблиц:
    // в схемах встречаются циклы внешних ключей, и на них подъём слоя обязан
    // остановиться, а не крутиться вечно.
    let mut layer: Vec<usize> = vec![0; free.len()];
    for _ in 0..group.len() {
        let mut moved = false;
        for (from, to) in &inside {
            if layer[*to] < layer[*from] + 1 {
                layer[*to] = layer[*from] + 1;
                moved = true;
            }
        }
        if !moved {
            break;
        }
    }

    let depth = group.iter().map(|&table| layer[table]).max().unwrap_or(0);

    // Порядок внутри слоя — по среднему положению соседей из соседних слоёв:
    // один проход снимает большую часть пересечений, а больше на импорте и не
    // нужно, диаграмма всё равно потом правится руками.
    let mut rows: Vec<Vec<usize>> = vec![Vec::new(); depth + 1];
    for &table in group {
        rows[layer[table]].push(table);
    }

    let mut order_of: Vec<f64> = vec![0.0; free.len()];
    for row in &rows {
        for (position, &table) in row.iter().enumerate() {
            order_of[table] = position as f64;
        }
    }
    for row in rows.iter_mut().skip(1) {
        row.sort_by(|a, b| {
            let key = |table: &usize| -> f64 {
                let neighbours: Vec<f64> = inside
                    .iter()
                    .filter(|(_, to)| to == table)
                    .map(|(from, _)| order_of[*from])
                    .collect();
                if neighbours.is_empty() {
                    order_of[*table]
                } else {
                    neighbours.iter().sum::<f64>() / neighbours.len() as f64
                }
            };
            key(a)
                .partial_cmp(&key(b))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }

    // Ширина слоя — по самой широкой таблице в нём: связи уходят вбок, и
    // разъезжающиеся колонки читаются хуже ровных.
    let mut layer_x = vec![0.0; depth + 1];
    for index in 1..=depth {
        let widest = rows[index - 1]
            .iter()
            .map(|&table| free[table].w)
            .fold(0.0_f64, f64::max);
        layer_x[index] = layer_x[index - 1] + widest + GUTTER;
    }

    let mut placed = Vec::with_capacity(group.len());
    for (index, row) in rows.iter().enumerate() {
        let mut y = 0.0;
        for &table in row {
            placed.push((table, layer_x[index], y));
            y += free[table].h + GAP_Y;
        }
    }

    placed
}

#[cfg(test)]
mod tests {
    use super::*;

    fn free(name: &str, columns: usize) -> FreeTable {
        let (w, h) = size_of(name, &vec!["column"; columns]);
        FreeTable {
            name: name.to_string(),
            w,
            h,
        }
    }

    fn fixed(name: &str, x: f64, y: f64) -> FixedTable {
        let (w, h) = size_of(name, &["column"]);
        FixedTable {
            name: name.to_string(),
            x,
            y,
            w,
            h,
        }
    }

    fn edge(from: &str, to: &str) -> Edge {
        Edge {
            from: from.to_string(),
            to: to.to_string(),
        }
    }

    /// Прямоугольники всех таблиц — расставленных и найденных раскладкой.
    fn rects(fixed: &[FixedTable], tables: &[FreeTable], placed: &[(f64, f64)]) -> Vec<Rect> {
        let mut all: Vec<Rect> = fixed
            .iter()
            .map(|t| Rect {
                x: t.x,
                y: t.y,
                w: t.w,
                h: t.h,
            })
            .collect();
        for (table, (x, y)) in tables.iter().zip(placed) {
            all.push(Rect {
                x: *x,
                y: *y,
                w: table.w,
                h: table.h,
            });
        }
        all
    }

    fn nothing_overlaps(rects: &[Rect]) {
        for (i, a) in rects.iter().enumerate() {
            for b in rects.iter().skip(i + 1) {
                assert!(
                    !a.overlaps(b),
                    "таблицы накрывают друг друга: {a:?} и {b:?}"
                );
            }
        }
    }

    /// Связь читается, когда сторона внешнего ключа стоит справа от стороны
    /// первичного и на её высоте: кривая тогда идёт по горизонтали.
    #[test]
    fn a_child_lands_to_the_right_of_its_parent() {
        let anchor = fixed("accounts", 500.0, 700.0);
        let tables = vec![free("payments", 2)];

        let placed = place(
            std::slice::from_ref(&anchor),
            &tables,
            &[edge("accounts", "payments")],
        );

        assert!(
            placed[0].0 >= anchor.x + anchor.w + GUTTER,
            "потомок должен встать справа: {placed:?}"
        );
        assert_eq!(placed[0].1, anchor.y);
    }

    /// И наоборот: таблица, на которую ссылается стоящая, встаёт слева от неё.
    #[test]
    fn a_parent_lands_to_the_left_of_its_child() {
        let anchor = fixed("payments", 900.0, 300.0);
        let tables = vec![free("accounts", 1)];

        let placed = place(
            std::slice::from_ref(&anchor),
            &tables,
            &[edge("accounts", "payments")],
        );

        assert!(
            placed[0].0 + tables[0].w + GUTTER <= anchor.x,
            "предок должен встать слева: {placed:?}"
        );
    }

    /// Цепочка ложится слоями слева направо — так её и читают.
    #[test]
    fn a_chain_reads_left_to_right() {
        let tables = vec![free("a", 1), free("b", 1), free("c", 1)];

        let placed = place(&[], &tables, &[edge("a", "b"), edge("b", "c")]);

        assert!(
            placed[0].0 < placed[1].0 && placed[1].0 < placed[2].0,
            "слои должны идти слева направо: {placed:?}"
        );
        nothing_overlaps(&rects(&[], &tables, &placed));
    }

    /// Новая таблица не ложится поверх того, что уже стоит на холсте, даже
    /// если её тянет туда связь.
    #[test]
    fn a_new_table_never_lands_on_top_of_what_is_already_there() {
        let anchor = fixed("accounts", 500.0, 700.0);
        // Место справа от accounts уже занято.
        let blocker = FixedTable {
            name: "invoices".to_string(),
            x: anchor.x + anchor.w + GUTTER,
            y: 700.0,
            w: 200.0,
            h: 200.0,
        };
        let tables = vec![free("payments", 3)];

        let placed = place(
            &[anchor.clone(), blocker.clone()],
            &tables,
            &[edge("accounts", "payments")],
        );

        nothing_overlaps(&rects(&[anchor, blocker], &tables, &placed));
    }

    /// Цикл внешних ключей в схеме встречается, и раскладка обязана на нём
    /// останавливаться, а не крутиться вечно.
    #[test]
    fn a_cycle_does_not_hang_the_layout() {
        let tables = vec![free("a", 1), free("b", 1), free("c", 1)];

        let placed = place(
            &[],
            &tables,
            &[edge("a", "b"), edge("b", "c"), edge("c", "a")],
        );

        assert_eq!(placed.len(), 3);
        nothing_overlaps(&rects(&[], &tables, &placed));
    }

    /// Таблицы без связей пакуются столбцами, а не вытягиваются в одну строку
    /// на весь холст.
    #[test]
    fn unrelated_tables_are_packed_in_columns() {
        let tables: Vec<FreeTable> = (0..6).map(|i| free(&format!("t{i}"), 4)).collect();

        let placed = place(&[], &tables, &[]);

        let columns: std::collections::HashSet<i64> =
            placed.iter().map(|(x, _)| *x as i64).collect();
        assert!(
            columns.len() < tables.len(),
            "несвязанные таблицы должны вставать столбцами: {placed:?}"
        );
        nothing_overlaps(&rects(&[], &tables, &placed));
    }
}
