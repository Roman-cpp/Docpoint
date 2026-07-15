import { invoke } from "@tauri-apps/api/core";
import type { CreateDocDTO } from "../model/doc-api.dto";

export function createDocApi(doc: CreateDocDTO): Promise<string> {
	return invoke("create_doc", { doc });
}
