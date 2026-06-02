import { invoke } from "@tauri-apps/api/core";
import type { CreateEnvironmentDTO, Environment } from "../model/type";

export function createEnvironmentApi(
	environmentableId: string,
	environmentableType: "doc" | "platform",
	environment: CreateEnvironmentDTO,
): Promise<Environment> {
	return invoke("create_environment", {
		environmentable_id: environmentableId,
		environmentable_type: environmentableType,
		environment,
	});
}
