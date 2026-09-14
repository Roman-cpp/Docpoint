import { invoke } from "@tauri-apps/api/core";

interface UpdateEnvironmentTokenParams {
	environmentId: string;
	token: string | null;
}

export function updateEnvironmentTokenApi({
	environmentId,
	token,
}: UpdateEnvironmentTokenParams): Promise<void> {
	return invoke("set_environment_access_token", { environmentId, token });
}
