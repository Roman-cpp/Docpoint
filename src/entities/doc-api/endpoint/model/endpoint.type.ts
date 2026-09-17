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

/**
 * Ответ эндпоинта под одним кодом статуса: подпись, структура и примечания к
 * её полям.
 *
 * Структура описывается так же, как тело запроса, — целым JSON-документом. Он
 * же служит примером: другого «как это выглядит» у ответа не бывает.
 */
export interface EndpointResponse {
	label: string;
	body: string;
	fields: FieldNote[];
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
