// Raw row shapes returned by SQLite queries (snake_case, numbers for booleans)

export interface DbDoca {
	id: string;
	name: string;
	version: string;
	desc: string;
}

export interface DbDocaTag {
	doca_id: string;
	tag: string;
}

export interface DbGroup {
	id: string;
	doca_id: string;
	label: string;
	sort_ord: number;
}

export interface DbEndpoint {
	id: string;
	group_id: string;
	method: string;
	path: string;
	name: string;
	description: string;
	auth: number;
	sort_ord: number;
}

export interface DbEndpointTag {
	endpoint_id: string;
	tag: string;
}

export interface DbParam {
	id: number;
	endpoint_id: string;
	kind: string;
	name: string;
	type: string;
	required: number;
	desc: string;
	default_val: string | null;
	sort_ord: number;
}

export interface DbResponse {
	id: number;
	endpoint_id: string;
	status_code: string;
	label: string;
	color: string;
	dot_color: string;
	example: string;
}

export interface DbResponseField {
	id: number;
	response_id: number;
	key: string;
	type: string;
	desc: string;
	example: string | null;
	sort_ord: number;
}

export interface DbSchema {
	id: string;
	doca_id: string;
	name: string;
	desc: string;
}

export interface DbSchemaField {
	id: number;
	schema_id: string;
	name: string;
	type: string;
	required: number;
	nullable: number;
	desc: string;
	note: string;
	example: string;
	sort_ord: number;
}

export interface DbSchemaFieldEnum {
	id: number;
	field_id: number;
	val: string;
	desc: string;
}

export interface DbSchemaUsedBy {
	id: number;
	schema_id: string;
	method: string;
	path: string;
	role: string;
}

export interface DbEnvConfig {
	id: string;
	doca_id: string;
	env: string;
	label: string;
	dot: string;
	base_url: string;
}
