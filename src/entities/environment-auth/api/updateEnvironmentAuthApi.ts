import { invoke } from "@tauri-apps/api/core";
import type { UpdateEnvironmentAuthDTO } from "../model/type";

export function updateEnvironmentAuthApi(
	auth: UpdateEnvironmentAuthDTO,
): Promise<void> {
	return invoke("update_environment_auth", { auth });
}
