import { invoke } from "@tauri-apps/api/core";
import type { CreateDocDTO } from "../model/type";

export function writeDocApi(doc: CreateDocDTO): Promise<string> {
	return invoke("create_doc", { doc });
}
