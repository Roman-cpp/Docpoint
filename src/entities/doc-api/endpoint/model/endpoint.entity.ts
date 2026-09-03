import type { HttpMethod } from "@/entities/shared/http-method";

export interface Param {
	name: string;
	type: string;
	required: boolean;
	desc: string;
	default?: string;
	value: string | null;
}

/** Поле схемы ответа: как документируется один ключ тела. */
export interface ResponseField {
	key: string;
	type: string;
	desc: string;
	example?: string;
}

/** Ответ эндпоинта под одним кодом статуса: подпись, схема и пример тела. */
export interface EndpointResponse {
	label: string;
	schema: ResponseField[];
	example: string;
}

export interface Endpoint {
	id: string;
	method: HttpMethod;
	path: string;
	name: string;
	description: string;
	auth: boolean;
	/** Описания сегментов пути. Какие сегменты есть, задаёт `path`. */
	pathParams: Param[];
	queryParams: Param[];
	bodyParams: Param[];
	responses: Record<string, EndpointResponse>;
}
