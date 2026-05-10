export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface EndpointMeta {
	id: string;
	method: HttpMethod;
	path: string;
	summary: string;
}

export interface ApiGroup {
	id: string;
	label: string;
	endpoints: EndpointMeta[];
}

export interface ApiData {
	version: string;
	baseUrl: string;
	groups: ApiGroup[];
}

export interface ParamDef {
	name: string;
	type: string;
	required: boolean;
	desc: string;
	default?: string;
}

export interface SchemaField {
	key: string;
	type: string;
	desc: string;
	example?: string;
}

export interface ResponseDef {
	label: string;
	color: string;
	dotColor: string;
	schema: SchemaField[];
	example: string;
}

export interface EndpointDetail {
	method: HttpMethod;
	path: string;
	summary: string;
	description: string;
	tags: string[];
	auth: boolean;
	isNew: boolean;
	queryParams?: ParamDef[];
	bodyParams?: ParamDef[];
	responses: Record<string, ResponseDef>;
	// codeExamples: Record<string, string>;
}

export interface TweakSettings {
	density: "Compact" | "Default" | "Spacious";
	showCode: boolean;
	showTry: boolean;
	version: string;
	theme: "Light" | "Dark";
}
