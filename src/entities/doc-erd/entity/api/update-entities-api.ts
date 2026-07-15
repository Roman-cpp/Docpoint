import { invoke } from "@tauri-apps/api/core";
import type { Entity } from "../model/entity.entity";

export function updateEntitiesApi(
	docId: string,
	schemas: Entity[],
): Promise<void> {
	return invoke("write_schemas", { docId, schemas });
}
