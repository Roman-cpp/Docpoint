import { invoke } from "@tauri-apps/api/core";

interface DeleteEndpointParams {
	endpointId: string;
}

export function deleteEndpointApi({
	endpointId,
}: DeleteEndpointParams): Promise<void> {
	return invoke("delete_endpoint", { endpointId });
}
