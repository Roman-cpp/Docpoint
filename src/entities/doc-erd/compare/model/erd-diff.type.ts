import type { DbNotice } from "@/entities/db-source/@x/doc-erd/compare";
import type { SchemaField } from "../../entity/@x/doc-erd/compare";

/** Откуда таблица, колонка или связь известна — и совпало ли описание. */
export type DiffStatus = "same" | "onlyInDoc" | "onlyInDb" | "differs";

/**
 * Что именно разошлось у колонки, которая есть с обеих сторон. Типа здесь нет:
 * в документе он свободная строка, а база отдаёт родное имя типа — сравнение в
 * лоб пометило бы расхождением почти каждое поле. Оба типа приезжают в
 * `docType`/`dbType`, и решение принимает человек.
 */
export type DiffMismatch = "nullable" | "pk";

export interface ColumnDiff {
	name: string;
	status: DiffStatus;
	/** Тип из документа; `null` — колонки в документе нет. */
	docType: string | null;
	/** Тип из базы; `null` — колонки в базе нет. */
	dbType: string | null;
	mismatch: DiffMismatch[];
	pk: boolean;
	nullable: boolean;
}

export interface TableDiff {
	/** Id сущности на диаграмме; `null` — таблица есть только в базе. */
	id: string | null;
	name: string;
	status: DiffStatus;
	/** Место, посчитанное для таблицы, которой на диаграмме нет. */
	x: number | null;
	y: number | null;
	/** Колонки объединением: сначала описанные, затем чужие. */
	columns: ColumnDiff[];
	/** Поля, как их видит база. Заполнены только у таблиц, которых нет на
	 *  диаграмме: по ним таблицу переносят в документ, не читая схему заново. */
	fields: SchemaField[];
}

export interface RelationDiff {
	status: DiffStatus;
	fromTable: string;
	fromColumn: string;
	toTable: string;
	toColumn: string;
}

/** Счётчики для панели: объём расхождений виден, не разглядывая холст. */
export interface DiffSummary {
	tablesOnlyInDoc: number;
	tablesOnlyInDb: number;
	tablesDiffer: number;
	columnsOnlyInDoc: number;
	columnsOnlyInDb: number;
	columnsDiffer: number;
	relationsOnlyInDoc: number;
	relationsOnlyInDb: number;
}

/** Диаграмма и схема живой базы, сведённые в одну картину. */
export interface ErdDiff {
	/** Схема базы, с которой сравнивали. */
	schema: string;
	tables: TableDiff[];
	relations: RelationDiff[];
	/** Что интроспекция выбросила и почему — расхождение может объясняться этим. */
	notices: DbNotice[];
	summary: DiffSummary;
}
