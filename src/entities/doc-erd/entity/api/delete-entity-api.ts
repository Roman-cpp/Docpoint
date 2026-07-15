import { invoke } from "@tauri-apps/api/core";

export function deleteEntityApi(entityId: string): Promise<void> {
	return invoke("delete_schema", { entityId });
}
