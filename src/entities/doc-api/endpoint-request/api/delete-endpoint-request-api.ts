import { invoke } from "@tauri-apps/api/core";

interface DeleteEndpointRequestParams {
	id: string;
}

export function deleteEndpointRequestApi({
	id,
}: DeleteEndpointRequestParams): Promise<void> {
	return invoke("delete_endpoint_request", { id });
}
