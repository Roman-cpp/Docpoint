import { invoke } from "@tauri-apps/api/core";
import type { MoveNodeDTO } from "../model/catalog-node.dto";

/** Перенести узел в другой каталог вместе со всем его поддеревом. */
export function moveNodeApi(node: MoveNodeDTO): Promise<void> {
	return invoke("move_node", { node });
}
