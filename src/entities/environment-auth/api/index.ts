import { invoke } from "@tauri-apps/api/core";
import type { UpdateEnvironmentAuthDTO } from "../model/type";

export function updateEnvironmentAuth(auth: UpdateEnvironmentAuthDTO): Promise<void> {
	return invoke("update_environment_auth", { auth });
}

export function setEnvironmentAccessToken(environmentId: string, token: string | null): Promise<void> {
	return invoke("set_environment_access_token", { environmentId, token });
}
