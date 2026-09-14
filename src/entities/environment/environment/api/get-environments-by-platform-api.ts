import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "../model/environment.type";

interface GetEnvironmentsByPlatformParams {
	platformId: string;
}

export function getEnvironmentsByPlatformApi({
	platformId,
}: GetEnvironmentsByPlatformParams): Promise<Environment[]> {
	return invoke("environments_by_platform", { platformId });
}
