import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "../model/type";

export function readEnvironmentsByPlatformApi(
	platformId: string,
): Promise<Environment[]> {
	return invoke("environments_by_platform", { platformId });
}
