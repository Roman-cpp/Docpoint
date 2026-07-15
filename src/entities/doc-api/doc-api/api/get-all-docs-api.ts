import { invoke } from "@tauri-apps/api/core";
import type { Doc } from "../model/doc-api.entity";

export function getAllDocsApi(): Promise<Doc[]> {
	return invoke("read_docs");
}
