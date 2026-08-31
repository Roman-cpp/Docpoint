import { invoke } from "@tauri-apps/api/core";
import type { EntityRelation } from "../model/entity-relation.entity";

/** Связи одной ERD-диаграммы: обе сущности связи принадлежат ей же. */
export function getRelationsApi(docErdId: string): Promise<EntityRelation[]> {
	return invoke("read_relations", { docErdId });
}
