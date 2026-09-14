import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "../model/environment.type";

interface DuplicateEnvironmentParams {
	environmentId: string;
}

export function duplicateEnvironmentApi({
	environmentId,
}: DuplicateEnvironmentParams): Promise<Environment> {
	return invoke("duplicate_environment", { environmentId });
}
