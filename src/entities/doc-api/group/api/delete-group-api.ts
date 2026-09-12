import { invoke } from "@tauri-apps/api/core";

interface DeleteGroupParams {
	groupId: string;
}

export function deleteGroupApi({ groupId }: DeleteGroupParams): Promise<void> {
	return invoke("delete_group", { groupId });
}
