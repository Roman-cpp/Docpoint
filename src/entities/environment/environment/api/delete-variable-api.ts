import { invoke } from "@tauri-apps/api/core";

export function deleteVariableApi(id: string): Promise<void> {
	return invoke("delete_variable", { id });
}
