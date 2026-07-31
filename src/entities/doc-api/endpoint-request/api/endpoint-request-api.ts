import { invoke } from "@tauri-apps/api/core";
import type {
	EndpointRequest,
	SaveEndpointRequestDTO,
} from "../model/endpoint-request.entity";

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

export function deleteEndpointRequestApi(id: string): Promise<void> {
	return invoke("delete_endpoint_request", { id });
}

/** Перезаписывает набор целиком: имя, режим и тело, заголовки и значения. */
export function saveEndpointRequestApi(
	request: SaveEndpointRequestDTO,
): Promise<void> {
	return invoke("save_endpoint_request", { request });
}
