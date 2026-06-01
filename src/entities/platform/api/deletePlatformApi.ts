import { invoke } from "@tauri-apps/api/core";

export function deletePlatformApi(id: string): Promise<void> {
	return invoke("delete_platform", { id });
}
