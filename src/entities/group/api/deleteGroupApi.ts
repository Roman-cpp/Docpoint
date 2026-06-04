import { invoke } from "@tauri-apps/api/core";

export function deleteGroupApi(groupId: string): Promise<void> {
	return invoke("delete_group", { groupId });
}
