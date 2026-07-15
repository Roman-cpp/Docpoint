import { invoke } from "@tauri-apps/api/core";
import type { UpdateEntityDTO } from "../model/entity.dto";

export function updateEntityApi(schema: UpdateEntityDTO): Promise<void> {
	return invoke("update_schema", { schema });
}
