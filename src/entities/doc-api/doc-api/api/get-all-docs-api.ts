import { invoke } from "@tauri-apps/api/core";
import type { Doc } from "../model/doc-api.type";

export function getAllDocsApi(): Promise<Doc[]> {
	return invoke("read_docs");
}
