import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "../model/environment.type";

interface GetEnvironmentsByDocParams {
	docId: string;
}

export function getEnvironmentsByDocApi({
	docId,
}: GetEnvironmentsByDocParams): Promise<Environment[]> {
	return invoke("read_environments_by_doc", { docId });
}
