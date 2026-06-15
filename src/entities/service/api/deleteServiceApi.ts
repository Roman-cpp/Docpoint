import { invoke } from "@tauri-apps/api/core";

/** Delete a microservice by its id. */
export function deleteServiceApi(id: string): Promise<void> {
	return invoke("delete_service", { id });
}
