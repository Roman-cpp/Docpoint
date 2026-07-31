export type ParamKind = "path" | "query" | "body";

/** Способ задать тело запроса: по полям схемы или сырым JSON. */
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

/** Именованный набор значений параметров для одного эндпоинта. */
export interface EndpointRequest {
	id: string;
	endpointId: string;
	name: string;
	sortOrd: number;
	bodyMode: BodyMode;
	rawBody: string;
	headers: RequestHeader[];
	values: RequestParamValue[];
}

/** Состояние набора целиком — фронт правит его локально и шлёт одним куском. */
export type SaveEndpointRequestDTO = Omit<
	EndpointRequest,
	"endpointId" | "sortOrd"
>;
