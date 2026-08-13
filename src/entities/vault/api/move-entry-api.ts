import { invoke } from "@tauri-apps/api/core";
import type { FileScope } from "@/entities/shared/file-scope";

/** Move a file or folder to another scope-relative path; renaming is the same
 *  call with an unchanged parent. Resolves to the entry's new path, or rejects
 *  when the destination is taken. */
export function moveEntryApi(
	scope: FileScope,
	from: string,
	to: string,
): Promise<string> {
	return invoke("move_entry", { scope, from, to });
}
