import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "../model/type";

export function writeEnvironmentsApi(
	docId: string,
	environments: Environment[],
): Promise<void> {
	return invoke("write_environments", { docId, environments });
}
