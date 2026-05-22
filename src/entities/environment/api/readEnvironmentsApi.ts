import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "../model/type";

export function readEnvironmentsApi(docId: string): Promise<Environment[]> {
	return invoke("read_environments", { docId });
}
