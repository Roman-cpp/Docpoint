import { invoke } from "@tauri-apps/api/core";
import type { CreateEnvironmentDTO } from "../model/environment.dto";
import type { Environment } from "../model/environment.entity";

export function createEnvironmentApi(
	environment: CreateEnvironmentDTO,
): Promise<Environment> {
	return invoke("create_environment", {
		platformId: environment.platformId,
		environment,
	});
}
