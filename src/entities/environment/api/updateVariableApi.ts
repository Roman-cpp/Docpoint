import { invoke } from "@tauri-apps/api/core";
import type { UpdateVariableDTO } from "../model/type";

export function updateVariableApi(variable: UpdateVariableDTO): Promise<void> {
	return invoke("update_variable", { variable });
}
