import { invoke } from "@tauri-apps/api/core";
import type { UpdateVariableDTO } from "../model/environment.dto";

export function updateVariableApi(variable: UpdateVariableDTO): Promise<void> {
	return invoke("update_variable", { variable });
}
