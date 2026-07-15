import { invoke } from "@tauri-apps/api/core";

export function deleteEndpointApi(endpointId: string): Promise<void> {
	return invoke("delete_endpoint", { endpointId });
}
