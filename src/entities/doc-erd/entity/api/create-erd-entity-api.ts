import { invoke } from "@tauri-apps/api/core";
import type { CreateEntityDTO } from "../model/entity.dto";

interface CreateErdEntityParams {
	docErdId: string;
	schema: CreateEntityDTO;
}

/** Persists a new table on an ERD canvas, returning the new entity id. */
export function createErdEntityApi({
	docErdId,
	schema,
}: CreateErdEntityParams): Promise<string> {
	return invoke("create_erd_schema", { docErdId, schema });
}
