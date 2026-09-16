import type {
	EnumValue,
	ImportErdPayload,
	ImportErdRelation,
	ImportErdTable,
	SchemaField,
} from "@/entities/doc-erd";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown) =>
	typeof value === "string" ? value.trim() : "";

/**
 * Булев флаг колонки. Значение не-boolean почти всегда означает опечатку
 * (`"pk": "true"`, `"pk": 1`), поэтому это ошибка, а не молчаливое приведение.
 */
const bool = (value: unknown, where: string): boolean => {
	if (value === undefined || value === null) return false;
	if (typeof value !== "boolean")
		throw new Error(`${where}: ожидалось true или false`);
	return value;
};

/**
 * Значения enum. Кроме полной формы `{ val, desc }` принимается короткая —
 * просто строка: у большинства перечислений описания всё равно нет.
 */
const parseEnum = (value: unknown, at: string): EnumValue[] => {
	if (value === undefined || value === null) return [];
	if (!Array.isArray(value))
		throw new Error(`${at}: enum должен быть массивом`);

	return value.map((entry, index) => {
		if (typeof entry === "string") return { val: entry, desc: "" };
		if (!isRecord(entry))
			throw new Error(
				`${at}: enum №${index + 1} — ожидалась строка или объект { val, desc }`,
			);

		const val = text(entry.val);
		if (!val) throw new Error(`${at}: enum №${index + 1} — пустое поле val`);
		return { val, desc: text(entry.desc) };
	});
};

const parseColumn = (
	item: unknown,
	table: string,
	index: number,
): SchemaField => {
	const where = `Таблица «${table}», колонка №${index + 1}`;
	if (!isRecord(item)) throw new Error(`${where}: ожидался объект`);

	const name = text(item.name);
	if (!name) throw new Error(`${where}: пустое поле name`);

	const at = `Таблица «${table}», колонка «${name}»`;
	return {
		name,
		// Тип — свободная строка: диаграмма его только показывает и ни с чем
		// не сверяет, поэтому подойдёт и `uuid`, и `numeric(12,2)`.
		type: text(item.type) || "string",
		pk: bool(item.pk, `${at}: pk`),
		req: bool(item.req, `${at}: req`),
		nullable: bool(item.nullable, `${at}: nullable`),
		desc: text(item.desc),
		note: text(item.note),
		example: text(item.example),
		enum: parseEnum(item.enum, at),
	};
};

const parseTable = (item: unknown, index: number): ImportErdTable => {
	const where = `Таблица №${index + 1}`;
	if (!isRecord(item)) throw new Error(`${where}: ожидался объект`);

	const name = text(item.name);
	if (!name) throw new Error(`${where}: пустое поле name`);

	const rawColumns = item.columns;
	if (!Array.isArray(rawColumns) || rawColumns.length === 0)
		throw new Error(
			`Таблица «${name}»: ожидался непустой массив columns — таблица без колонок ни с чем не свяжется`,
		);

	const fields = rawColumns.map((column, ci) => parseColumn(column, name, ci));

	const seen = new Set<string>();
	for (const field of fields) {
		if (seen.has(field.name))
			throw new Error(
				`Таблица «${name}»: колонка «${field.name}» описана дважды — на имена колонок ссылаются связи`,
			);
		seen.add(field.name);
	}

	// Координат в файле нет: раскладку целиком считает `layoutErdTables` при
	// импорте, а дальше положение живёт в базе и меняется перетаскиванием.
	return { name, desc: text(item.desc), fields };
};

/**
 * Адрес конца связи — `таблица.колонка`. Делим по последней точке: имя таблицы
 * бывает с квалификатором схемы (`public.users.id`), а точка внутри имени
 * колонки не встречается.
 */
const endpoint = (value: unknown, where: string): [string, string] => {
	const raw = text(value);
	if (!raw) throw new Error(`${where}: пусто, ожидалось «таблица.колонка»`);

	const dot = raw.lastIndexOf(".");
	if (dot <= 0 || dot === raw.length - 1)
		throw new Error(
			`${where}: «${raw}» — ожидалось «таблица.колонка», например «accounts.id»`,
		);

	return [raw.slice(0, dot), raw.slice(dot + 1)];
};

const parseRelations = (
	value: unknown,
	tables: ImportErdTable[],
): ImportErdRelation[] => {
	// Связи необязательны: набор несвязанных таблиц — тоже законная диаграмма.
	if (value === undefined || value === null) return [];
	if (!Array.isArray(value)) throw new Error("relations должен быть массивом");

	const columnsOf = new Map(
		tables.map((t) => [t.name, new Set(t.fields.map((f) => f.name))]),
	);

	const resolve = (table: string, column: string, where: string) => {
		const columns = columnsOf.get(table);
		if (!columns) throw new Error(`${where}: в файле нет таблицы «${table}»`);
		if (!columns.has(column))
			throw new Error(`${where}: в таблице «${table}» нет колонки «${column}»`);
	};

	const seen = new Set<string>();

	return value.map((item, index) => {
		const where = `Связь №${index + 1}`;
		if (!isRecord(item)) throw new Error(`${where}: ожидался объект`);

		const [fromTable, fromColumn] = endpoint(item.from, `${where}, from`);
		const [toTable, toColumn] = endpoint(item.to, `${where}, to`);

		resolve(fromTable, fromColumn, `${where}, from`);
		resolve(toTable, toColumn, `${where}, to`);

		if (fromTable === toTable)
			throw new Error(
				`${where}: «${fromTable}» ссылается сама на себя — холст пока не умеет рисовать такие связи`,
			);

		// Ключ ненаправленный: та же пара колонок в обратную сторону — не вторая
		// связь, а спор о том, где сторона первичного ключа.
		const ends = [`${fromTable}.${fromColumn}`, `${toTable}.${toColumn}`]
			.sort()
			.join(" ↔ ");
		if (seen.has(ends))
			throw new Error(
				`${where}: связь ${ends} описана дважды — у пары колонок может быть только одна связь`,
			);
		seen.add(ends);

		return { fromTable, fromColumn, toTable, toColumn };
	});
};

/**
 * Разбирает файл импорта ERD и проверяет его форму.
 *
 * Формат целиком описан в `docs/import/doc-erd/doc-erd-import-format.md`.
 *
 * Файл пользователь пишет руками, поэтому каждая ошибка называет конкретную
 * таблицу, колонку или связь — текст уходит прямо в тост. Всё, что можно
 * проверить до записи, проверяется здесь: импорт создаёт узел, сущности и связи
 * отдельными командами, и падение на середине оставило бы половину диаграммы.
 */
export function parseErdImport(raw: string): ImportErdPayload {
	let json: unknown;
	try {
		json = JSON.parse(raw);
	} catch {
		throw new Error("Файл не является валидным JSON");
	}

	if (!isRecord(json))
		throw new Error("Ожидался JSON-объект с полями version, erd, tables");

	if (json.version !== 1)
		throw new Error(
			`Неподдерживаемая версия формата: ${JSON.stringify(json.version)} (поддерживается 1)`,
		);

	const erd = json.erd;
	if (!isRecord(erd))
		throw new Error("Нет блока erd — из него берётся имя диаграммы");

	const id = text(erd.id);
	const name = text(erd.name);
	if (!name) throw new Error("erd.name пуст — диаграмме нужно имя");

	const rawTables = json.tables;
	if (!Array.isArray(rawTables) || rawTables.length === 0)
		throw new Error("tables должен быть непустым массивом");

	const tables = rawTables.map(parseTable);

	// Связи адресуют таблицы по именам, поэтому тёзки неразличимы.
	const seen = new Set<string>();
	for (const table of tables) {
		if (seen.has(table.name))
			throw new Error(
				`Таблица «${table.name}» описана дважды — на имена таблиц ссылаются связи`,
			);
		seen.add(table.name);
	}

	return {
		version: 1,
		erd: id ? { id, name } : { name },
		tables,
		relations: parseRelations(json.relations, tables),
	};
}
