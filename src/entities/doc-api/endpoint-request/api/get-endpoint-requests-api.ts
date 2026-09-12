import { invoke } from "@tauri-apps/api/core";
import type { EndpointRequest } from "../model/endpoint-request.type";

interface GetEndpointRequestsParams {
	endpointId: string;
}

export function getEndpointRequestsApi({
	endpointId,
}: GetEndpointRequestsParams): Promise<EndpointRequest[]> {
	return invoke("list_endpoint_requests", { endpointId });
}
