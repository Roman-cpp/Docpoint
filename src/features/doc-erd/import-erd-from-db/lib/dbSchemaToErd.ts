import type { DbSchema } from "@/entities/db-source";
import type { ImportErdPayload } from "@/entities/doc-erd";

/**
 * Схема внешней базы → payload импорта ERD, суженный до отмеченных таблиц.
 *
 * Всё, что холст не нарисует (самоссылки, дубли пары колонок, ссылки за
 * пределы схемы), отсеял бэкенд ещё при интроспекции и объяснил в `notices`.
 * Здесь остаётся единственный отбор, который бэкенду недоступен: он зависит от
 * того, что пользователь отметил галочками.
 */
export function dbSchemaToErd(
	schema: DbSchema,
	selected: ReadonlySet<string>,
	erd: { name: string; desc: string },
): ImportErdPayload {
	const tables = schema.tables
		.filter((table) => selected.has(table.name))
		.map((table) => ({
			name: table.name,
			desc: table.desc,
			// Поле интроспекции и поле ERD — одна и та же форма: бэкенд приводит
			// схему к ней специально, чтобы импорт шёл существующим путём.
			fields: table.fields.map((field) => ({
				...field,
				enum: field.enum ?? [],
			})),
		}));

	// Связь с концом за пределами выбора нарисовать не на чем.
	const relations = schema.relations.filter(
		(relation) =>
			selected.has(relation.fromTable) && selected.has(relation.toTable),
	);

	return { version: 1, erd, tables, relations };
}
