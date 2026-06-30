import { invoke } from "@tauri-apps/api/core";
import type { Doc } from "../model/doc-api.type";

export function readDocApi(id: string): Promise<Doc | null> {
	return invoke("read_doc", { id });
}
