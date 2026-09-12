import { invoke } from "@tauri-apps/api/core";

interface DeleteVariableParams {
	id: string;
}

export function deleteVariableApi({ id }: DeleteVariableParams): Promise<void> {
	return invoke("delete_variable", { id });
}
