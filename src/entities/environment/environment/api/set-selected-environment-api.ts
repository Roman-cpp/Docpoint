import { invoke } from "@tauri-apps/api/core";

interface SetSelectedEnvironmentParams {
	environmentId: string | null;
}

export function setSelectedEnvironmentApi({
	environmentId,
}: SetSelectedEnvironmentParams): Promise<void> {
	return invoke("set_selected_environment", { environmentId });
}
