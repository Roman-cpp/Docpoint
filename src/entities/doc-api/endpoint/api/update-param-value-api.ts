import { invoke } from "@tauri-apps/api/core";

export function updateParamValueApi(
	endpointId: string,
	kind: "path" | "query" | "body",
	name: string,
	value: string,
): Promise<void> {
	return invoke("update_param_value", { endpointId, kind, name, value });
}
