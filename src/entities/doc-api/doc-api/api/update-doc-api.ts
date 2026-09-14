import { invoke } from "@tauri-apps/api/core";
import type { UpdateDocDTO } from "../model/doc-api.dto";

export function updateDocApi(doc: UpdateDocDTO): Promise<string> {
	return invoke("update_doc", { doc });
}
