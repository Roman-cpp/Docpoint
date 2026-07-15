import { invoke } from "@tauri-apps/api/core";

export function setSelectedEnvironmentApi(
	environmentId: string | null,
): Promise<void> {
	return invoke("set_selected_environment", { environmentId });
}
