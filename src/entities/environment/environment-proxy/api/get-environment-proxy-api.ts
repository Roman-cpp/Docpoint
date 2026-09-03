import { invoke } from "@tauri-apps/api/core";
import type { EnvironmentProxy } from "../model/environment-proxy.entity";

export function getEnvironmentProxyApi(
	environmentId: string,
): Promise<EnvironmentProxy> {
	return invoke("read_environment_proxy", { environmentId });
}
