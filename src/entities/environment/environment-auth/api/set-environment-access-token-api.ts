import { invoke } from "@tauri-apps/api/core";

export function setEnvironmentAccessTokenApi(
	environmentId: string,
	token: string | null,
): Promise<void> {
	return invoke("set_environment_access_token", { environmentId, token });
}
