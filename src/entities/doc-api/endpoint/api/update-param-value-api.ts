import { invoke } from "@tauri-apps/api/core";

interface UpdateParamValueParams {
	endpointId: string;
	kind: "path" | "query" | "body";
	name: string;
	value: string;
}

export function updateParamValueApi({
	endpointId,
	kind,
	name,
	value,
}: UpdateParamValueParams): Promise<void> {
	return invoke("update_param_value", { endpointId, kind, name, value });
}
