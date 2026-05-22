import { invoke } from "@tauri-apps/api/core";

export function deleteDocApi(id: string): Promise<void> {
	return invoke("delete_doc", { id });
}
