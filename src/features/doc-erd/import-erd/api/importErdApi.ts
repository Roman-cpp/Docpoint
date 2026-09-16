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

/** Итог импорта: диаграмму выбрал сам файл, поэтому в отчёте есть и она. */
export interface ImportErdReport {
	docId: string;
	docName: string;
	/** `true` — диаграммы с таким id не было, и она заведена этим импортом. */
	created: boolean;
	tablesAdded: number;
	tablesUpdated: number;
	relationsAdded: number;
}

/**
 * Заводит или дописывает диаграмму из файла вместе с таблицами и связями.
 *
 * Одной командой, а не циклом создания сущностей: id таблиц выдаёт база, и
 * сопоставлять их с именами, на которые ссылаются связи, должна та же сторона,
 * что их выдала. Что делать — создавать диаграмму или дописывать, — решает
 * `node.id`, приехавший из файла.
 */
export function importErdApi(
	node: CreateNodeDTO,
	tables: ImportErdTableDTO[],
	relations: ImportErdRelationDTO[],
): Promise<ImportErdReport> {
	return invoke("import_erd", { node, tables, relations });
}
