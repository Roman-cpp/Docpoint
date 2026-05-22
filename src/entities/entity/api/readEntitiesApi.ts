import { invoke } from "@tauri-apps/api/core";
import type { Entity } from "../model/type";

export function readEntitiesApi(docId: string): Promise<Entity[]> {
	return invoke("read_schemas", { docId });
}
