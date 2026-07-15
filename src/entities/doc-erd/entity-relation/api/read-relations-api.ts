import { invoke } from "@tauri-apps/api/core";
import type { EntityRelation } from "../model/entity-relation.entity";

export function readRelationsApi(docId: string): Promise<EntityRelation[]> {
	return invoke("read_relations", { docId });
}
