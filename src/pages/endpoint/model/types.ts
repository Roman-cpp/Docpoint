export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type EnvKey = "prod" | "staging" | "local";

export interface EnvConfig {
	label: string;
	baseUrl: string;
}

export interface ExplorerParam {
	name: string;
	type: string;
	req: boolean;
	desc: string;
	def?: string;
}

export interface ExplorerSchemaField {
	key: string;
	type: string;
	desc: string;
	ex?: string;
}

export interface ExplorerResponse200 {
	schema: ExplorerSchemaField[];
	example: string;
}

export interface ExplorerEndpoint {
	id: string;
	method: HttpMethod;
	path: string;
	summary: string;
	desc: string;
	tags: string[];
	auth: boolean;
	params: ExplorerParam[];
	response200: ExplorerResponse200;
}

export interface ExplorerGroup {
	id: string;
	label: string;
	endpoints: ExplorerEndpoint[];
}

export interface ExplorerApi {
	id: string;
	name: string;
	icon: string;
	iconBg: string;
	accent: string;
	version: string;
	desc: string;
	uptime: number;
	status: "operational" | "degraded" | "outage";
	latency: string;
	requests: string;
	tags: string[];
	groups: ExplorerGroup[];
}
