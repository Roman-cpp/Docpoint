import type { SchemaField } from "../../entity/@x/doc-erd/import";

/** Таблица из файла импорта, уже приведённая к форме сущности. */
export interface ImportErdTable {
	name: string;
	desc: string;
	fields: SchemaField[];
}

/** Связь из файла импорта: концы адресованы именами, а не id. */
export interface ImportErdRelation {
	fromTable: string;
	fromColumn: string;
	toTable: string;
	toColumn: string;
}

/** Разобранный файл импорта ERD. */
export interface ImportErdPayload {
	version: 1;
	erd: { name: string };
	tables: ImportErdTable[];
	relations: ImportErdRelation[];
}
