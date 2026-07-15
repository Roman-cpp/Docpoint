import { invoke } from "@tauri-apps/api/core";
import type { CreateEntityDTO } from "../model/entity.dto";

export function createEntityApi(
	docId: string,
	schema: CreateEntityDTO,
): Promise<string> {
	return invoke("create_schema", { docId, schema });
}
