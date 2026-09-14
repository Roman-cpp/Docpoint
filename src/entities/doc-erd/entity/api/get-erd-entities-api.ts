import { invoke } from "@tauri-apps/api/core";
import type { Entity } from "../model/entity.type";

interface GetErdEntitiesParams {
	docErdId: string;
}

/** Entities (tables) belonging to an ERD diagram, addressed by its doc_erd id. */
export function getErdEntitiesApi({
	docErdId,
}: GetErdEntitiesParams): Promise<Entity[]> {
	return invoke("read_erd_schemas", { docErdId });
}
