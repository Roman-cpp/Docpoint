import { invoke } from "@tauri-apps/api/core";

interface DeleteEntityParams {
	entityId: string;
}

export function deleteEntityApi({
	entityId,
}: DeleteEntityParams): Promise<void> {
	return invoke("delete_schema", { entityId });
}
