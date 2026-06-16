import { invoke } from "@tauri-apps/api/core";
import type { EndpointRequest, ParamKind } from "../model/type";

export function listEndpointRequestsApi(
	endpointId: string,
): Promise<EndpointRequest[]> {
	return invoke("list_endpoint_requests", { endpointId });
}

export function createEndpointRequestApi(
	endpointId: string,
	name: string,
): Promise<EndpointRequest> {
	return invoke("create_endpoint_request", { endpointId, name });
}

export function renameEndpointRequestApi(
	id: string,
	name: string,
): Promise<void> {
	return invoke("rename_endpoint_request", { id, name });
}

export function deleteEndpointRequestApi(id: string): Promise<void> {
	return invoke("delete_endpoint_request", { id });
}

export function setRequestParamValueApi(
	requestId: string,
	kind: ParamKind,
	name: string,
	value: string,
): Promise<void> {
	return invoke("set_request_param_value", { requestId, kind, name, value });
}
