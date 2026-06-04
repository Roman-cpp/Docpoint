import { invoke } from "@tauri-apps/api/core";
import type { CreateDocDTO } from "../model/doc.dto";

export function writeDocApi(doc: CreateDocDTO): Promise<string> {
	return invoke("create_doc", { doc });
}
