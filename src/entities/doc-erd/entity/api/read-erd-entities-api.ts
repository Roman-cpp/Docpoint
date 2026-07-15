import { invoke } from "@tauri-apps/api/core";
import type { Entity } from "../model/entity.entity";

/** Entities (tables) belonging to an ERD diagram, addressed by its doc_erd id. */
export function readErdEntitiesApi(docErdId: string): Promise<Entity[]> {
	return invoke("read_erd_schemas", { docErdId });
}
