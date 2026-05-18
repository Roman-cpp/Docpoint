import { invoke } from "@tauri-apps/api/core";
import type { Entity } from "../model/type";

export function readEntities(docId: string): Promise<Entity[]> {
	return invoke("read_schemas", { docId });
}

export function writeEntities(docId: string, schemas: Entity[]): Promise<void> {
	return invoke("write_schemas", { docId, schemas });
}
