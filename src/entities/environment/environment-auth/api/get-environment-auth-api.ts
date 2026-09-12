import { invoke } from "@tauri-apps/api/core";
import type { EnvironmentAuth } from "../model/environment-auth.type";

interface GetEnvironmentAuthParams {
	environmentId: string;
}

export function getEnvironmentAuthApi({
	environmentId,
}: GetEnvironmentAuthParams): Promise<EnvironmentAuth> {
	return invoke("read_environment_auth", { environmentId });
}
