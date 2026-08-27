import { invoke } from "@tauri-apps/api/core";
import type { CatalogNode } from "../model/catalog-node.entity";

/** Все узлы платформы одним списком — дерево собирает фронтенд. */
export function getCatalogTreeApi(platformId: string): Promise<CatalogNode[]> {
	return invoke("read_catalog_tree", { platformId });
}
