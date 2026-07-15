import { invoke } from "@tauri-apps/api/core";
import type { Group } from "../model/group.entity";

export function getGroupsApi(docId: string): Promise<Group[]> {
	return invoke("read_groups", { docId });
}
