export interface EnumValue {
	val: string;
	desc: string;
}

export interface SchemaField {
	name: string;
	type: string;
	req: boolean;
	nullable: boolean;
	pk: boolean;
	desc: string;
	note: string;
	example: string;
	enum?: EnumValue[];
}

export interface Entity {
	id: string;
	name: string;
	desc: string;
	fields: SchemaField[];
	/**
	 * Положение таблицы на ERD-холсте. `null` — сущность ещё не размещали:
	 * холст разложит её автолейаутом и сразу сохранит результат.
	 */
	posX: number | null;
	posY: number | null;
}

/** Новое положение одной таблицы на холсте. */
export interface EntityPosition {
	id: string;
	x: number;
	y: number;
}
