import { invoke } from "@tauri-apps/api/core";
import type { UpdateEnvironmentProxyDTO } from "../model/environment-proxy.dto";

export function updateEnvironmentProxyApi(
	proxy: UpdateEnvironmentProxyDTO,
): Promise<void> {
	return invoke("update_environment_proxy", { proxy });
}
