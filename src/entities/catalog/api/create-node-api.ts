import { invoke } from "@tauri-apps/api/core";
import type { CreateNodeDTO } from "../model/catalog-node.dto";
import type { CatalogNode } from "../model/catalog-node.type";

/** Создать каталог или документ любого вида. */
export function createNodeApi(node: CreateNodeDTO): Promise<CatalogNode> {
	return invoke("create_node", { node });
}
