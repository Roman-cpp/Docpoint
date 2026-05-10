export interface EnumValue {
	val: string;
	desc: string;
}

export interface SchemaField {
	name: string;
	type: string;
	req: boolean;
	nullable: boolean;
	desc: string;
	note: string;
	example: string;
	enum?: EnumValue[];
}

export interface UsedByItem {
	method: string;
	path: string;
	role: string;
}

export interface Schema {
	id: string;
	name: string;
	desc: string;
	fields: SchemaField[];
	usedBy: UsedByItem[];
}
