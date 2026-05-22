import { invoke } from "@tauri-apps/api/core";
import type { EnvironmentAuth } from "../model/type";

export function readEnvironmentAuthApi(
	environmentId: string,
): Promise<EnvironmentAuth> {
	return invoke("read_environment_auth", { environmentId });
}
