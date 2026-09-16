/** Вид внешней базы. Здесь же появится NoSQL, когда до него дойдёт очередь. */
export type DbKind = "postgres" | "mysql" | "sqlite";

/** Значение перечисления, как его отдаёт интроспекция. */
export interface DbEnumValue {
	val: string;
	desc: string;
}

/**
 * Колонка чужой базы в том виде, в каком она приходит с бэкенда.
 *
 * Форма совпадает с полем ERD-сущности — интроспекция специально приводит
 * схему к ней, чтобы импорт шёл существующим путём. Тип описан здесь, а не взят
 * из `entities/doc-erd`: сущности слоя не импортируют друг друга, и это
 * описание собственного контракта ответа, а не копия чужой модели.
 */
export interface DbField {
	name: string;
	type: string;
	req: boolean;
	nullable: boolean;
	pk: boolean;
	desc: string;
	note: string;
	example: string;
	enum?: DbEnumValue[];
}

/** Таблица чужой базы, уже приведённая к форме таблицы ERD. */
export interface DbTable {
	name: string;
	desc: string;
	fields: DbField[];
}

/** Связь между колонками: концы названы именами — id появятся только при записи. */
export interface DbRelation {
	fromTable: string;
	fromColumn: string;
	toTable: string;
	toColumn: string;
}

/**
 * Что интроспекция изменила или выбросила: живая схема почти всегда содержит
 * то, чего холст не рисует, и предпросмотр обязан это показать.
 */
export interface DbNotice {
	kind: "composite" | "duplicate" | "externalRef" | "empty" | "large";
	message: string;
}

/** Схема внешней базы в форме, которую примет импорт ERD. */
export interface DbSchema {
	schema: string;
	tables: DbTable[];
	relations: DbRelation[];
	notices: DbNotice[];
}
