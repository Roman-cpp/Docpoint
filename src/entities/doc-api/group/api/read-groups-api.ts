import { invoke } from "@tauri-apps/api/core";
import type { Group } from "../model/group.entity";

export function readGroupsApi(docId: string): Promise<Group[]> {
	return invoke("read_groups", { docId });
}
