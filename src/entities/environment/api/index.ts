import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "../model/type";

export function readEnvironments(docId: string): Promise<Environment[]> {
	return invoke("read_environments", { docId });
}

export function writeEnvironments(docId: string, environments: Environment[]): Promise<void> {
	return invoke("write_environments", { docId, environments });
}
