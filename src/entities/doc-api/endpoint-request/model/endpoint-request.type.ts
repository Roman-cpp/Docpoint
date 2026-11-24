/**
 * Параметры, которые попадают в URL. Тело здесь не участвует — оно хранится
 * отдельным JSON-документом в `EndpointRequest.body`.
 */
export type ParamKind = "path" | "query";

/**
 * Каким редактором открывать тело набора: формой по полям схемы или редактором
 * JSON. Тело в обоих случаях одно и то же — это настройка отображения, а не
 * признак того, где лежат данные.
 */
export type BodyMode = "fields" | "raw";

export interface RequestParamValue {
	kind: ParamKind;
	name: string;
	value: string;
}

/** Произвольный заголовок запроса, заданный пользователем. */
export interface RequestHeader {
	name: string;
	value: string;
	enabled: boolean;
}

/**
 * Кука набора: та же тройка, что у заголовка, но уходит не отдельной строкой,
 * а парой внутри `Cookie` — туда же, куда бэкенд домешивает сессию окружения.
 */
export interface RequestCookie {
	name: string;
	value: string;
	enabled: boolean;
}

/** Именованный набор значений параметров для одного эндпоинта. */
export interface EndpointRequest {
	id: string;
	endpointId: string;
	name: string;
	sortOrd: number;
	bodyMode: BodyMode;
	/** Тело запроса как JSON-документ. Пустая строка — тела нет. */
	body: string;
	headers: RequestHeader[];
	cookies: RequestCookie[];
	values: RequestParamValue[];
}

/** Состояние набора целиком — фронт правит его локально и шлёт одним куском. */
export type UpdateEndpointRequestDTO = Omit<
	EndpointRequest,
	"endpointId" | "sortOrd"
>;
