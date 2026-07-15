import { invoke } from "@tauri-apps/api/core";

export function updateEnvironmentTokenApi(
	environmentId: string,
	token: string | null,
): Promise<void> {
	return invoke("set_environment_access_token", { environmentId, token });
}
