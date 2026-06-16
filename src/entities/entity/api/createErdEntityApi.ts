import { invoke } from "@tauri-apps/api/core";
import type { CreateEntityDTO } from "../model/type";

/** Persists a new table on an ERD canvas, returning the new entity id. */
export function createErdEntityApi(
	docErdId: string,
	schema: CreateEntityDTO,
): Promise<string> {
	return invoke("create_erd_schema", { docErdId, schema });
}
