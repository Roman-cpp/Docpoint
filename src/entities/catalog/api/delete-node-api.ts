import { invoke } from "@tauri-apps/api/core";

interface DeleteNodeParams {
	id: string;
}

/** Удалить узел вместе с поддеревом и телами документов в нём. */
export function deleteNodeApi({ id }: DeleteNodeParams): Promise<void> {
	return invoke("delete_node", { id });
}
