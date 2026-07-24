import { invoke } from "@tauri-apps/api/core";
import type { FileScope } from "@/entities/shared/file-scope";

/** Delete a folder and everything inside it. */
export function deleteDirectoryApi(
	scope: FileScope,
	path: string,
): Promise<void> {
	return invoke("delete_directory", { scope, path });
}
