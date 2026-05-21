import { invoke } from "@tauri-apps/api/core";

export function updateParamValue(
	endpointId: string,
	kind: "query" | "body",
	name: string,
	value: string,
): Promise<void> {
	return invoke("update_param_value", { endpointId, kind, name, value });
}
