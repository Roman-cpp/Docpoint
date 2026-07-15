import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "../model/environment.entity";

export function getEnvironmentsByPlatformApi(
	platformId: string,
): Promise<Environment[]> {
	return invoke("environments_by_platform", { platformId });
}
