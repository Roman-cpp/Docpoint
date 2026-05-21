export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

interface Param {
	name: string;
	type: string;
	required: boolean;
	desc: string;
	default?: string;
  value: string | null;
}

interface SchemaField {
	key: string;
	type: string;
	desc: string;
	example?: string;
}

interface Response {
	label: string;
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
	queryParams: Param[];
	bodyParams: Param[];
	responses: Record<string, Response>;
}

export type CreateEndpointDTO = Omit<Endpoint, "id">;
