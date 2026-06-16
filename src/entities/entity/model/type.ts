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
}

export type CreateEntityDTO = Omit<Entity, "id">;

export type UpdateEntityDTO = Entity;
