export type ParamKind = "path" | "query" | "body";

export interface RequestParamValue {
	kind: ParamKind;
	name: string;
	value: string;
}

/** Именованный набор значений параметров для одного эндпоинта. */
export interface EndpointRequest {
	id: string;
	endpointId: string;
	name: string;
	sortOrd: number;
	values: RequestParamValue[];
}
