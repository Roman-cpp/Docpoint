import { invoke } from "@tauri-apps/api/core";
import type { CreateEnvironmentDTO, Environment } from "../model/type";

export function createEnvironmentApi(
	environment: CreateEnvironmentDTO,
): Promise<Environment> {
	return invoke("create_environment", {
		environmentableId: environment.environmentableId,
		environmentableType: environment.environmentableType,
		environment,
	});
}
