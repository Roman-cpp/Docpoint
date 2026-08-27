import { invoke } from "@tauri-apps/api/core";
import type { CatalogNode } from "../model/catalog-node.entity";

/** Один узел по id, или `null`, если его больше нет. */
export function getNodeApi(id: string): Promise<CatalogNode | null> {
	return invoke("read_node", { id });
}
