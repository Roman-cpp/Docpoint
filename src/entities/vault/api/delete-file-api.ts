import { invoke } from "@tauri-apps/api/core";
import type { FileScope } from "@/entities/shared/file-scope";

/** Delete a single file by its scope-relative path. */
export function deleteFileApi(scope: FileScope, path: string): Promise<void> {
	return invoke("delete_file", { scope, path });
}
