import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "../model/type";

export function duplicateEnvironmentApi(
	environmentId: string,
): Promise<Environment> {
	return invoke("duplicate_environment", { environmentId });
}
