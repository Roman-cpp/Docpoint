import { invoke } from "@tauri-apps/api/core";
import type { RenameNodeDTO } from "../model/catalog-node.dto";

/** Переименовать узел и заодно поправить его описание. */
export function renameNodeApi(node: RenameNodeDTO): Promise<void> {
	return invoke("rename_node", { node });
}
