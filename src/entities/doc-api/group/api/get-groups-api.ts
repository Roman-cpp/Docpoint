import { invoke } from "@tauri-apps/api/core";
import type { Group } from "../model/group.type";

interface GetGroupsParams {
	docId: string;
}

export function getGroupsApi({ docId }: GetGroupsParams): Promise<Group[]> {
	return invoke("read_groups", { docId });
}
