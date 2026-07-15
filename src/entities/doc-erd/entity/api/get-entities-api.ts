import { invoke } from "@tauri-apps/api/core";
import type { Entity } from "../model/entity.entity";

export function getEntitiesApi(docId: string): Promise<Entity[]> {
	return invoke("read_schemas", { docId });
}
