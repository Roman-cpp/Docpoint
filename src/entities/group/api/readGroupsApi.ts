import { invoke } from "@tauri-apps/api/core";
import type { Group } from "../model/type";

export function readGroupsApi(docId: string): Promise<Group[]> {
	return invoke("read_groups", { docId });
}
