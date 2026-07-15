import { invoke } from "@tauri-apps/api/core";

export function deleteEnvironmentApi(id: string): Promise<void> {
	return invoke("delete_environment", { id });
}
