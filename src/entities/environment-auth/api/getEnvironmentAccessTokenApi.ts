import { invoke } from "@tauri-apps/api/core";

export function getEnvironmentAccessTokenApi(
	environmentId: string,
): Promise<string | null> {
	return invoke("get_environment_access_token", { environmentId });
}
