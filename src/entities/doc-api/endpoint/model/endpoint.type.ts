import type { HttpMethod } from "@/entities/shared/http-method";

/** Куда параметр уезжает в адресе: сегмент пути или строка запроса. */
export type UrlParamKind = "path" | "query";

export interface Param {
	name: string;
	type: string;
	required: boolean;
	desc: string;
	default?: string;
	value: string | null;
}

/**
 * Примечание к одному полю JSON-документа.
 *
 * Тип поля виден в самом документе (`"count": 0` — число), поэтому здесь его
 * нет: только `format` — уточнение для того, чего JSON не различает (`uuid`,
 * `datetime`, `integer`), и пустое, когда уточнять нечего.
 */
export interface FieldNote {
	/** Путь к полю внутри документа: `title`, `meta.total`, `data[].id`. */
	path: string;
	format: string;
	required: boolean;
	desc: string;
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
	/**
	 * Структура тела запроса: JSON-документ целиком. Пустая строка — тела нет.
	 * Документ задаёт и форму, и типы значений, поэтому плоского списка полей
	 * рядом с ним нет — только примечания к его полям.
	 */
	body: string;
	bodyFields: FieldNote[];
	responses: Record<string, EndpointResponse>;
}
