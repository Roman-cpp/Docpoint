import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "../../environment/model/type";

export function readEnvironmentsByDocApi(
	docId: string,
): Promise<Environment[]> {
	return invoke("read_environments_by_doc", { docId });
}
