import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "../model/environment.entity";

export function duplicateEnvironmentApi(
	environmentId: string,
): Promise<Environment> {
	return invoke("duplicate_environment", { environmentId });
}
