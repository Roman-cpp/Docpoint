import { invoke } from "@tauri-apps/api/core";
import type { CatalogNode } from "../model/catalog-node.type";

interface GetCatalogTreeParams {
	platformId: string;
}

/** Все узлы платформы одним списком — дерево собирает фронтенд. */
export function getCatalogTreeApi({
	platformId,
}: GetCatalogTreeParams): Promise<CatalogNode[]> {
	return invoke("read_catalog_tree", { platformId });
}
