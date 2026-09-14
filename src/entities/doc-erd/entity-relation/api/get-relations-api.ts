import { invoke } from "@tauri-apps/api/core";
import type { EntityRelation } from "../model/entity-relation.type";

interface GetRelationsParams {
	docErdId: string;
}

/** Связи одной ERD-диаграммы: обе сущности связи принадлежат ей же. */
export function getRelationsApi({
	docErdId,
}: GetRelationsParams): Promise<EntityRelation[]> {
	return invoke("read_relations", { docErdId });
}
