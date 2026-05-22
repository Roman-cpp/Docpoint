import { invoke } from "@tauri-apps/api/core";
import type { Doc } from "../model/type";

export function readAllDocsApi(): Promise<Doc[]> {
	return invoke("read_docs");
}
