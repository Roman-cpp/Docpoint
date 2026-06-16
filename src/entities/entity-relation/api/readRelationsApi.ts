import { invoke } from "@tauri-apps/api/core";
import type { EntityRelation } from "../model/type";

export function readRelationsApi(docId: string): Promise<EntityRelation[]> {
	return invoke("read_relations", { docId });
}
