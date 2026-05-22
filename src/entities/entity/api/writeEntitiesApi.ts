import { invoke } from "@tauri-apps/api/core";
import type { Entity } from "../model/type";

export function writeEntitiesApi(
	docId: string,
	schemas: Entity[],
): Promise<void> {
	return invoke("write_schemas", { docId, schemas });
}
