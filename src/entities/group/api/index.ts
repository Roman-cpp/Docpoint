import { invoke } from "@tauri-apps/api/core";
import type { Group } from "../model/type";

export function readGroups(docId: string): Promise<Group[]> {
	return invoke("read_groups", { docId });
}

export function writeGroups(docId: string, groups: Group[]): Promise<void> {
	return invoke("write_groups", { docId, groups });
}
