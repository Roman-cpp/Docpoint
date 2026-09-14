import { invoke } from "@tauri-apps/api/core";
import type { EnvironmentProxy } from "../model/environment-proxy.type";

interface GetEnvironmentProxyParams {
	environmentId: string;
}

export function getEnvironmentProxyApi({
	environmentId,
}: GetEnvironmentProxyParams): Promise<EnvironmentProxy> {
	return invoke("read_environment_proxy", { environmentId });
}
