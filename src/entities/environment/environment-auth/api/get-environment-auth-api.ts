import { invoke } from "@tauri-apps/api/core";
import type { EnvironmentAuth } from "../model/environment-auth.entity";

export function getEnvironmentAuthApi(
	environmentId: string,
): Promise<EnvironmentAuth> {
	return invoke("read_environment_auth", { environmentId });
}
