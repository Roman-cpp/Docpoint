import { invoke } from "@tauri-apps/api/core";
import type { EntityRelation } from "../model/entity-relation.entity";

export function getRelationsApi(docId: string): Promise<EntityRelation[]> {
	return invoke("read_relations", { docId });
}
