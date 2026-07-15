import { invoke } from "@tauri-apps/api/core";
import type { Group } from "../model/group.entity";

export function writeGroupsApi(docId: string, groups: Group[]): Promise<void> {
	return invoke("write_groups", { docId, groups });
}
