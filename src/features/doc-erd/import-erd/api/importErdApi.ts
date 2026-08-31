import { invoke } from "@tauri-apps/api/core";
import type { CreateNodeDTO } from "@/entities/catalog";
import type { SchemaField } from "@/entities/doc-erd";

/** Таблица в том виде, в каком её принимает команда импорта: id ещё нет. */
export interface ImportErdTableDTO {
	name: string;
	desc: string;
	fields: SchemaField[];
	x: number;
	y: number;
}

/** Связь импорта: концы адресованы именами — id сущностей заводит бэкенд. */
export interface ImportErdRelationDTO {
	fromTable: string;
	fromColumn: string;
	toTable: string;
	toColumn: string;
}

/**
 * Создаёт узел-диаграмму из файла и заливает в него таблицы со связями.
 *
 * Одной командой, а не циклом создания сущностей: id таблиц выдаёт база, и
 * сопоставлять их с именами, на которые ссылаются связи, должна та же сторона,
 * что их выдала. Возвращает id созданного узла.
 */
export function importErdApi(
	node: CreateNodeDTO,
	tables: ImportErdTableDTO[],
	relations: ImportErdRelationDTO[],
): Promise<string> {
	return invoke("import_erd", { node, tables, relations });
}
