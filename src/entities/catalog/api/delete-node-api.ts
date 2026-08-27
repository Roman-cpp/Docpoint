import { invoke } from "@tauri-apps/api/core";

/** Удалить узел вместе с поддеревом и телами документов в нём. */
export function deleteNodeApi(id: string): Promise<void> {
	return invoke("delete_node", { id });
}
