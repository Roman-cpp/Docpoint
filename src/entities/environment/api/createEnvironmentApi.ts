import { invoke } from "@tauri-apps/api/core";
import type { CreateEnvironmentDTO, Environment } from "../model/type";

export function createEnvironmentApi(
	docId: string,
	environment: CreateEnvironmentDTO,
): Promise<Environment> {
	return invoke("create_environment", { docId, environment });
}
