import type { ImportErdTable } from "@/entities/doc-erd";

/**
 * Геометрия таблицы на холсте — та же, что в `canvas-wasm`
 * (`domain/table/model.rs`): шапка плюс строка на колонку. Высота нужна, чтобы
 * таблицы в одной колонке сетки не наезжали друг на друга, и считается без
 * замера текста — по числу колонок.
 */
const HEADER_H = 38;
const ROW_H = 30;

/** Отступ от левого верхнего угла холста. */
const ORIGIN = 40;
/** Шаг сетки по горизонтали: ширина таблицы плюс место под связи. */
const COL_W = 260;
/** Просвет между таблицами, стоящими друг под другом. */
const GAP_Y = 40;

const heightOf = (table: ImportErdTable) =>
	HEADER_H + table.fields.length * ROW_H;

/**
 * Раскладывает импортируемые таблицы сеткой: колонок — корень из их числа,
 * внутри колонки таблицы стоят стопкой в порядке файла.
 *
 * Координат в файле импорта нет — их целиком назначает импорт, чтобы диаграмма
 * сразу открывалась разложенной, а не пересчитывалась холстом. Раскладка
 * повторяет автолейаут сцены (`Scene::load`), поэтому импортированная диаграмма
 * выглядит так же, как собранная руками.
 *
 * Возвращает координаты в том же порядке, что и `tables`.
 */
export function layoutErdTables(
	tables: ImportErdTable[],
): { x: number; y: number }[] {
	const cols = Math.max(1, Math.ceil(Math.sqrt(tables.length)));
	// Текущий низ каждой колонки сетки — следующая таблица встаёт под него.
	const bottom = new Array<number>(cols).fill(ORIGIN);

	return tables.map((table, index) => {
		const col = index % cols;
		const y = bottom[col];
		bottom[col] = y + heightOf(table) + GAP_Y;
		return { x: ORIGIN + col * COL_W, y };
	});
}
