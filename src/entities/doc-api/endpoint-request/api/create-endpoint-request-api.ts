import { invoke } from "@tauri-apps/api/core";
import type { EndpointRequest } from "../model/endpoint-request.type";

interface CreateEndpointRequestParams {
	endpointId: string;
	name: string;
}

export function createEndpointRequestApi({
	endpointId,
	name,
}: CreateEndpointRequestParams): Promise<EndpointRequest> {
	return invoke("create_endpoint_request", { endpointId, name });
}
