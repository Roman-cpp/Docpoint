import { invoke } from "@tauri-apps/api/core";
import type { UpdateEnvironmentDTO } from "../model/type";

export function updateEnvironmentApi(
	environment: UpdateEnvironmentDTO,
): Promise<void> {
	return invoke("update_environment", { environment });
}
