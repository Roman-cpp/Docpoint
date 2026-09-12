import { invoke } from "@tauri-apps/api/core";
import type { CatalogNode } from "../model/catalog-node.type";

interface GetNodeParams {
	id: string;
}

/** Один узел по id, или `null`, если его больше нет. */
export function getNodeApi({ id }: GetNodeParams): Promise<CatalogNode | null> {
	return invoke("read_node", { id });
}
