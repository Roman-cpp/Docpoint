type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ParamDef {
	name: string;
	type: string;
	required: boolean;
	desc: string;
	default?: string;
}

interface SchemaField {
	key: string;
	type: string;
	desc: string;
	example?: string;
}

interface ResponseDef {
	label: string;
	color: string;
	dotColor: string;
	schema: SchemaField[];
	example: string;
}

export interface Endpoint {
	id: string;
	method: HttpMethod;
	path: string;
	name: string;
	description: string;
	tags: string[];
	auth: boolean;
	queryParams: ParamDef[];
	bodyParams: ParamDef[];
	responses: Record<string, ResponseDef>;
}
